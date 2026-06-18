import {
  Horizon,
  Networks,
  TransactionBuilder,
  Operation,
  Address,
  Contract,
  Account,
  hash,
  StrKey,
  xdr,
  scValToNative,
} from "@stellar/stellar-sdk";
import { Server as RpcServer } from "@stellar/stellar-sdk/rpc";
import { signSorobanTx, type WalletType } from "./multi-wallet";

const TESTNET_RPC = "https://soroban-testnet.stellar.org";
const WASM_PATH = "/wasm/anchorfx_escrow.wasm";

interface TxStatus {
  status: "pending" | "building" | "simulating" | "signing" | "submitting" | "success" | "failed";
  hash?: string;
  error?: string;
  contractId?: string;
}

interface EscrowData {
  sender: string;
  receiver: string;
  token: string;
  amount: string;
  timeoutLedger: number;
  status: string;
  createdAt: number;
}

export type { TxStatus, EscrowData };

export function createRpcServer(): RpcServer {
  return new RpcServer(TESTNET_RPC, { allowHttp: false });
}

async function sha256(data: Uint8Array): Promise<Buffer> {
  const hash = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return Buffer.from(hash);
}

export async function deployContract(
  sourcePublicKey: string,
  walletType: WalletType,
  onStatus: (status: TxStatus) => void
): Promise<TxStatus> {
  try {
    onStatus({ status: "building" });

    // Load WASM
    const wasmResponse = await fetch(WASM_PATH);
    if (!wasmResponse.ok) {
      return { status: "failed", error: `Failed to load WASM: ${wasmResponse.status}` };
    }
    const wasmBuffer = new Uint8Array(await wasmResponse.arrayBuffer());
    const wasmHash = await sha256(wasmBuffer);

    const server = new Horizon.Server("https://horizon-testnet.stellar.org");
    const sourceAccount = await server.loadAccount(sourcePublicKey);

    // Step 1: Upload WASM via RPC (simulate → assemble → wallet sign → send)
    onStatus({ status: "building" });
    const rpc = createRpcServer();

    const uploadTx = new TransactionBuilder(sourceAccount, {
      fee: "1000000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.uploadContractWasm({ wasm: wasmBuffer }))
      .setTimeout(60)
      .build();

    onStatus({ status: "simulating" });
    let uploadPrep;
    try {
      uploadPrep = await rpc.prepareTransaction(uploadTx);
    } catch {
      return { status: "failed", error: "RPC simulation failed — try deploying via Stellar CLI instead" };
    }

    onStatus({ status: "signing" });
    const { signedTxXdr: uploadXdr } = await signSorobanTx(
      walletType,
      uploadPrep.toXDR(),
      Networks.TESTNET
    );

    onStatus({ status: "submitting" });
    const uploadResult = await rpc.sendTransaction(
      TransactionBuilder.fromXDR(uploadXdr, Networks.TESTNET)
    );
    if (uploadResult.status === "ERROR") {
      return { status: "failed", error: `WASM upload failed: ${JSON.stringify(uploadResult.errorResult ?? "unknown")}` };
    }

    // Wait for upload transaction to confirm on ledger before getting new sequence
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // Refresh account with retry in case upload hasn't landed yet
    let account2;
    for (let i = 0; i < 10; i++) {
      account2 = await server.loadAccount(sourcePublicKey);
      if (BigInt(account2.sequence) > BigInt(sourceAccount.sequence)) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (!account2!) {
      return { status: "failed", error: "Timed out waiting for upload to confirm" };
    }

    // Step 2: Create contract via RPC (no constructor args — call init separately)
    onStatus({ status: "simulating" });
    const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
    const adminAddress = Address.fromString(sourcePublicKey);

    const createTx = new TransactionBuilder(account2, {
      fee: "100000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.createCustomContract({
          wasmHash,
          address: adminAddress,
          salt,
        })
      )
      .setTimeout(30)
      .build();

    const createPrep = await rpc.prepareTransaction(createTx);

    onStatus({ status: "signing" });
    const { signedTxXdr: createXdr } = await signSorobanTx(
      walletType,
      createPrep.toXDR(),
      Networks.TESTNET
    );

    onStatus({ status: "submitting" });
    const createResult = await rpc.sendTransaction(
      TransactionBuilder.fromXDR(createXdr, Networks.TESTNET)
    );

    if (createResult.status === "ERROR") {
      return { status: "failed", error: `Contract creation failed: ${JSON.stringify(createResult.errorResult ?? "unknown")}` };
    }

    // Compute deterministic contract ID
    const preimage = Buffer.concat([
      Buffer.from([0, 0, 0, 1]),
      Buffer.from(adminAddress.toScAddress().toXDR("base64"), "base64"),
      salt,
      wasmHash,
    ]);
    const contractId = StrKey.encodeContract(hash(preimage));

    // Report success immediately — contract is created
    onStatus({ status: "success", hash: createResult.hash, contractId });

    // Step 3: Initialize in background (non-blocking)
    try {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const account3 = await server.loadAccount(sourcePublicKey);

      const invoker = new Contract(contractId);
      const initTx = new TransactionBuilder(account3, {
        fee: "100000",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(invoker.call("init", adminAddress.toScVal(), adminAddress.toScVal()))
        .setTimeout(30)
        .build();

      const initPrep = await rpc.prepareTransaction(initTx);
      const { signedTxXdr: initXdr } = await signSorobanTx(
        walletType,
        initPrep.toXDR(),
        Networks.TESTNET
      );

      const initResult = await rpc.sendTransaction(
        TransactionBuilder.fromXDR(initXdr, Networks.TESTNET)
      );

      if (String(initResult.status) === "SUCCESS") {
        onStatus({ status: "success", hash: createResult.hash, contractId });
        console.log("Contract initialized successfully");
      }
    } catch (initErr) {
      console.warn("Init deferred — contract deployed, init failed:", initErr);
    }

    return { status: "success", hash: createResult.hash, contractId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Deployment failed";
    return { status: "failed", error: msg };
  }
  return { status: "failed", error: "Unexpected: no result" };
}

/**
 * Read escrow data from an existing contract.
 */
export async function getEscrowFromContract(
  contractId: string,
  escrowId: number = 1
): Promise<EscrowData | null> {
  try {
    const rpc = createRpcServer();

    const contract = new Contract(contractId);
    const sourcePublicKey = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const fakeAccount = new Account(sourcePublicKey, "1");

    const tx = new TransactionBuilder(fakeAccount, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call("get_escrow", xdr.ScVal.scvU64(new xdr.Uint64(escrowId))))
      .setTimeout(30)
      .build();

    const sim = await rpc.simulateTransaction(tx);
    if (!sim || "error" in sim) return null;

    const simResult = (sim as { result?: { retval?: xdr.ScVal } }).result;
    if (!simResult?.retval) return null;

    const native = scValToNative(simResult.retval);
    if (!native || typeof native !== "object") return null;

    const data = native as Record<string, unknown>;
    if (!data.sender) return null;

    return {
      sender: String(data.sender ?? ""),
      receiver: String(data.receiver ?? ""),
      token: String(data.token ?? ""),
      amount: String(data.amount ?? "0"),
      timeoutLedger: Number(data.timeout_ledger ?? 0),
      status: String(data.status ?? "unknown"),
      createdAt: Number(data.created_at ?? 0),
    };
  } catch {
    return null;
  }
}

/**
 * Track transaction status via polling.
 */
export async function trackTransaction(
  hash: string,
  onUpdate: (status: TxStatus) => void
): Promise<void> {
  const rpc = createRpcServer();
  let attempts = 0;
  const maxAttempts = 30;

  const poll = async () => {
    if (attempts >= maxAttempts) {
      onUpdate({ status: "failed", error: "Transaction timed out" });
      return;
    }
    attempts++;

    try {
      const tx = await rpc.getTransaction(hash);
      if (tx.status === "SUCCESS") {
        onUpdate({ status: "success", hash });
      } else if (tx.status === "FAILED") {
        onUpdate({
          status: "failed",
          hash,
          error: "Transaction failed on-chain",
        });
      } else {
        onUpdate({ status: "pending", hash });
        setTimeout(poll, 3000);
      }
    } catch {
      onUpdate({ status: "pending", hash });
      setTimeout(poll, 3000);
    }
  };

  onUpdate({ status: "submitting", hash });
  await poll();
}

/**
 * Subscribe to contract events via Server-Sent Events.
 * Returns an abort function to unsubscribe.
 */
export function subscribeContractEvents(
  contractId: string,
  onEvent: (event: { type: string; data: unknown; ledger: number }) => void,
  onError?: (err: Error) => void
): () => void {
  const url = `/api/events?contract=${encodeURIComponent(contractId)}`;
  const source = new EventSource(url);

  source.addEventListener("contract", (e) => {
    try {
      const ev = JSON.parse(e.data);
      onEvent(ev);
    } catch {
      // skip malformed
    }
  });

  source.addEventListener("open", () => {
    // connected
  });

  source.addEventListener("error", () => {
    onError?.(new Error("SSE connection error"));
    source.close();
  });

  return () => source.close();
}
