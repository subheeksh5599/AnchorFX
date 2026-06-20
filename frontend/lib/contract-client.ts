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
import { RPC_URL, HORIZON_URL, XLM_SAC_ADDRESS, CONTRACT_ID } from "./env";

const WASM_PATH = "/wasm/anchorfx_escrow.wasm";

interface TxStatus {
  status: "pending" | "building" | "simulating" | "signing" | "submitting" | "success" | "failed";
  hash?: string;
  error?: string;
  contractId?: string;
  escrowId?: number;
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

export type { TxStatus, EscrowData }; export { XLM_SAC_ADDRESS as NATIVE_XLM_SAC };

export function createRpcServer(): RpcServer {
  return new RpcServer(RPC_URL, { allowHttp: false });
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

    const server = new Horizon.Server(HORIZON_URL);
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
      const oracleAddress = Address.fromString(sourcePublicKey); // same key owns oracle — deploy oracle contract separately for production

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
        .addOperation(invoker.call("init", adminAddress.toScVal(), oracleAddress.toScVal()))
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

function scvI128(n: bigint): xdr.ScVal {
  return xdr.ScVal.scvI128(new xdr.Int128Parts({ lo: n as unknown as xdr.Uint64, hi: BigInt(0) as unknown as xdr.Uint64 }));
}

function scvU64(n: number): xdr.ScVal {
  return xdr.ScVal.scvU64(new xdr.Uint64(n));
}

function scvU32(n: number): xdr.ScVal {
  return xdr.ScVal.scvU32(n);
}

async function loadAccount(pub: string): Promise<Account> {
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const resp = await server.loadAccount(pub);
  return new Account(resp.accountId(), resp.sequence);
}

async function pollTx(hash: string, rpc: RpcServer): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const r2 = await rpc.getTransaction(hash);
    if (r2.status === "SUCCESS") return;
    if (r2.status === "FAILED") throw new Error("Transaction failed on-chain");
  }
  throw new Error("Transaction timed out");
}

async function invokeContract(
  sourcePublicKey: string,
  walletType: WalletType,
  contractId: string,
  fnName: string,
  args: xdr.ScVal[],
  onStatus: (s: TxStatus) => void,
): Promise<TxStatus> {
  try {
    onStatus({ status: "building" });
    const rpc = createRpcServer();
    const contract = new Contract(contractId);
    const account = await loadAccount(sourcePublicKey);

    const tx = new TransactionBuilder(account, {
      fee: "1000000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call(fnName, ...args))
      .setTimeout(60)
      .build();

    onStatus({ status: "simulating" });
    const prep = await rpc.prepareTransaction(tx);

    onStatus({ status: "signing" });
    const { signedTxXdr } = await signSorobanTx(walletType, prep.toXDR(), Networks.TESTNET);

    onStatus({ status: "submitting" });
    const submitted = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
    const result = await rpc.sendTransaction(submitted);
    if (result.status === "ERROR") {
      const errStr = JSON.stringify(result.errorResult ?? "unknown");
      if (errStr.includes("tx_bad_auth")) {
        return { status: "failed", error: "Auth signature missing — ensure Freighter extension is updated to v6+. Try reconnecting wallet." };
      }
      return { status: "failed", error: `Transaction failed: ${errStr}` };
    }

    onStatus({ status: "pending", hash: result.hash });
    await pollTx(result.hash, rpc);

    return { status: "success", hash: result.hash };
  } catch (err: unknown) {
    return { status: "failed", error: err instanceof Error ? err.message : "Transaction failed" };
  }
}

export async function approveTokenTransfer(
  sourcePublicKey: string,
  walletType: WalletType,
  tokenAddress: string,
  spenderContractId: string,
  amount: bigint,
  onStatus: (s: TxStatus) => void,
): Promise<TxStatus> {
  try {
    onStatus({ status: "building" });
    const rpc = createRpcServer();
    const latest = await rpc.getLatestLedger();
    const expiry = latest.sequence + 2_000_000;
    const tokenContract = new Contract(tokenAddress);
    const senderAddr = Address.fromString(sourcePublicKey);
    const spenderAddr = Address.fromString(spenderContractId);
    const account = await loadAccount(sourcePublicKey);

    const tx = new TransactionBuilder(account, {
      fee: "1000000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(tokenContract.call("approve", senderAddr.toScVal(), spenderAddr.toScVal(), scvI128(amount), scvU32(expiry)))
      .setTimeout(60)
      .build();

    onStatus({ status: "simulating" });
    const prep = await rpc.prepareTransaction(tx);

    onStatus({ status: "signing" });
    const { signedTxXdr } = await signSorobanTx(walletType, prep.toXDR(), Networks.TESTNET);

    onStatus({ status: "submitting" });
    const result = await rpc.sendTransaction(TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET));
    if (result.status === "ERROR") {
      const errStr = JSON.stringify(result.errorResult ?? "unknown");
      if (errStr.includes("tx_bad_auth")) {
        return { status: "failed", error: "Auth signature missing — ensure Freighter extension is updated to v6+. Try reconnecting wallet." };
      }
      return { status: "failed", error: `Token approval failed: ${errStr}` };
    }

    onStatus({ status: "pending", hash: result.hash });
    await pollTx(result.hash, rpc);
    return { status: "success", hash: result.hash };
  } catch (err: unknown) {
    return { status: "failed", error: err instanceof Error ? err.message : "Approval failed" };
  }
}

export async function createEscrow(
  sourcePublicKey: string,
  walletType: WalletType,
  contractId: string,
  receiver: string,
  token: string,
  amount: bigint,
  timeoutBlocks: number,
  corridor: number,
  onStatus: (s: TxStatus) => void,
): Promise<TxStatus> {
  const senderAddr = Address.fromString(sourcePublicKey);
  const receiverAddr = Address.fromString(receiver);
  const tokenAddr = Address.fromString(token);

  return invokeContract(sourcePublicKey, walletType, contractId, "create_escrow", [
    senderAddr.toScVal(),
    receiverAddr.toScVal(),
    tokenAddr.toScVal(),
    scvI128(amount),
    scvU32(timeoutBlocks),
    scvU32(corridor),
  ], onStatus);
}

export async function counterpartyApprove(
  sourcePublicKey: string,
  walletType: WalletType,
  contractId: string,
  escrowId: number,
  onStatus: (s: TxStatus) => void,
): Promise<TxStatus> {
  return invokeContract(sourcePublicKey, walletType, contractId, "counterparty_approve", [scvU64(escrowId)], onStatus);
}

export async function settleEscrow(
  sourcePublicKey: string,
  walletType: WalletType,
  contractId: string,
  escrowId: number,
  onStatus: (s: TxStatus) => void,
): Promise<TxStatus> {
  return invokeContract(sourcePublicKey, walletType, contractId, "settle", [scvU64(escrowId)], onStatus);
}

export async function refundEscrow(
  sourcePublicKey: string,
  walletType: WalletType,
  contractId: string,
  escrowId: number,
  onStatus: (s: TxStatus) => void,
): Promise<TxStatus> {
  return invokeContract(sourcePublicKey, walletType, contractId, "refund", [scvU64(escrowId)], onStatus);
}

export async function cancelEscrow(
  sourcePublicKey: string,
  walletType: WalletType,
  contractId: string,
  escrowId: number,
  onStatus: (s: TxStatus) => void,
): Promise<TxStatus> {
  return invokeContract(sourcePublicKey, walletType, contractId, "cancel", [scvU64(escrowId)], onStatus);
}
