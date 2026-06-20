import {
  Horizon,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  Asset,
} from "@stellar/stellar-sdk";
import { HORIZON_URL } from "./env";

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  network: string | null;
  networkPassphrase: string | null;
}

export async function checkConnection(): Promise<WalletState> {
  try {
    const { isConnected: connected } = await isConnected();
    if (!connected) {
      return { connected: false, publicKey: null, network: null, networkPassphrase: null };
    }
    const { address } = await getAddress();
    const { network, networkPassphrase } = await getNetwork();
    return { connected: true, publicKey: address, network, networkPassphrase };
  } catch {
    return { connected: false, publicKey: null, network: null, networkPassphrase: null };
  }
}

export async function connectWallet(): Promise<WalletState | null> {
  try {
    await setAllowed();
    const { address } = await requestAccess();
    const { network, networkPassphrase } = await getNetwork();
    return { connected: true, publicKey: address, network, networkPassphrase };
  } catch (err) {
    console.error("Failed to connect wallet:", err);
    return null;
  }
}

export async function getBalance(publicKey: string): Promise<string> {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const account = await server.loadAccount(publicKey);
    const balances = account.balances;
    const xlm = balances.find((b) => b.asset_type === "native");
    return xlm?.balance ?? "0";
  } catch {
    return "0";
  }
}

export async function sendXLM(
  sourcePublicKey: string,
  destinationAddress: string,
  amount: string,
): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const server = new Horizon.Server(HORIZON_URL);
    const sourceAccount = await server.loadAccount(sourcePublicKey);

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: destinationAddress,
          asset: Asset.native(),
          amount,
        }),
      )
      .setTimeout(30)
      .build();

    const { signedTxXdr } = await signTransaction(transaction.toXDR(), {
      networkPassphrase: Networks.TESTNET,
    });

    const tx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
    const result = await server.submitTransaction(tx);

    return { success: true, hash: result.hash };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Transaction failed";
    return { success: false, error: message };
  }
}
