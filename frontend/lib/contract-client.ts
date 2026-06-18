import {
  Horizon,
  Networks,
  TransactionBuilder,
  Operation,
  Address,
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

    const rpc = createRpcServer();

    // Load WASM
    const wasmResponse = await fetch(WASM_PATH);
    if (!wasmResponse.ok) {
      return { status: "failed", error: `Failed to load WASM: ${wasmResponse.status}` };
    }
    const wasmBuffer = new Uint8Array(await wasmResponse.arrayBuffer());
    const wasmHash = await sha256(wasmBuffer);

    const server = new Horizon.Server("https://horizon-testnet.stellar.org");
    const sourceAccount = await server.loadAccount(sourcePublicKey);

    // Step 1: Upload WASM
    const uploadTx = new TransactionBuilder(sourceAccount, {
      fee: "100000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.uploadContractWasm({ wasm: wasmBuffer })
      )
      .setTimeout(30)
      .build();

    onStatus({ status: "simulating" });
    const uploadPrep = await rpc.prepareTransaction(uploadTx);

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

    // Step 2: Create contract
    const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
    const adminAddress = Address.fromString(sourcePublicKey);

    const createTx = new TransactionBuilder(sourceAccount, {
      fee: "100000",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.createCustomContract({
          wasmHash,
          address: adminAddress,
          salt,
          constructorArgs: [adminAddress.toScVal()],
        })
      )
      .setTimeout(30)
      .build();

    const createPrep = await rpc.prepareTransaction(createTx);

    const { signedTxXdr: createXdr } = await signSorobanTx(
      walletType,
      createPrep.toXDR(),
      Networks.TESTNET
    );

    const createResult = await rpc.sendTransaction(
      TransactionBuilder.fromXDR(createXdr, Networks.TESTNET)
    );

    if (createResult.status === "ERROR") {
      return { status: "failed", error: `Contract creation failed: ${JSON.stringify(createResult.errorResult ?? "unknown")}` };
    }

    // Derive contract ID
    const contractId = `C${(createResult.hash ?? "unknown").slice(0, 54)}`;

    onStatus({ status: "success", hash: createResult.hash, contractId });
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
  contractId: string
): Promise<EscrowData | null> {
  try {
    const rpc = createRpcServer();

    const key = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: new Address(contractId).toScAddress(),
        key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Escrow")]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    const result = await rpc.getLedgerEntries(key);
    if (!result.entries?.length || result.entries.length === 0) return null;

    const entry = result.entries[0];
    if (!entry) return null;

    // Parse the ledger entry data to extract escrow fields
    const contractData = entry.val.contractData();
    if (!contractData) return null;

    const data = scValToNative(contractData.val());
    if (!data || typeof data !== "object") return null;

    const unpacked = data as Record<string, unknown>;

    return {
      sender: String(unpacked.sender ?? ""),
      receiver: String(unpacked.receiver ?? ""),
      token: String(unpacked.token ?? ""),
      amount: String(unpacked.amount ?? "0"),
      timeoutLedger: Number(unpacked.timeout_ledger ?? 0),
      status: String(unpacked.status ?? "unknown"),
      createdAt: Number(unpacked.created_at ?? 0),
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
 * Listen to contract events via polling.
 */
export async function pollContractEvents(
  contractId: string,
  onEvent: (event: { type: string; data: unknown }) => void,
  signal?: AbortSignal
): Promise<void> {
  const rpc = createRpcServer();
  let cursor: string | undefined;

  const poll = async () => {
    if (signal?.aborted) return;
    try {
      const baseRequest = {
        filters: [
          {
            type: "contract" as const,
            contractIds: [contractId],
          },
        ],
        limit: 10,
      };

      const request = cursor
        ? { ...baseRequest, cursor }
        : { ...baseRequest, startLedger: 1 };

      const response = await rpc.getEvents(request);

      for (const event of response.events) {
        const rawType = event.topic[0]?.toString() ?? "unknown";
        const type = rawType.replace(/^Symbol\(\)/, "").replace(/^"(.*)"$/, "$1");
        onEvent({ type, data: event.value });
      }

      if (response.events.length > 0) {
        cursor = response.cursor;
      }
    } catch {
      // Retry
    }
    if (!signal?.aborted) {
      setTimeout(poll, 5000);
    }
  };

  poll();
}
