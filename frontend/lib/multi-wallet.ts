import {
  isConnected,
  getAddress,
  getNetwork,
  requestAccess,
  signTransaction,
  setAllowed,
} from "@stellar/freighter-api";
import {
  Horizon,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  Asset,
} from "@stellar/stellar-sdk";

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  network: string | null;
  networkPassphrase: string | null;
  walletType: WalletType | null;
}

export type WalletType = "freighter" | "xbull" | "albedo";

export type WalletError =
  | { type: "WALLET_NOT_FOUND"; wallet: WalletType; message: string }
  | { type: "USER_REJECTED"; message: string }
  | { type: "INSUFFICIENT_BALANCE"; required: string; have: string; message: string }
  | { type: "TRANSACTION_FAILED"; message: string };

interface XBullResponse {
  address: string;
  network: string;
  networkPassphrase: string;
  sign: (xdr: string) => Promise<{ signedTxXdr: string }>;
}

declare global {
  interface Window {
    xBullSDK?: {
      connect: () => Promise<XBullResponse>;
      sign: (xdr: string) => Promise<{ signedTxXdr: string }>;
    };
  }
}

export async function getAvailableWallets(): Promise<WalletType[]> {
  const available: WalletType[] = [];

  if (typeof window !== "undefined") {
    const hasFreighter = await isConnected().then((r) => r.isConnected).catch(() => false);
    const hasXBull = typeof window.xBullSDK !== "undefined";
    if (hasFreighter) available.push("freighter");
    if (hasXBull) available.push("xbull");
  }

  return available;
}

export async function checkConnection(): Promise<WalletState> {
  try {
    const { isConnected: connected } = await isConnected();
    if (!connected) {
      return { connected: false, publicKey: null, network: null, networkPassphrase: null, walletType: null };
    }
    const { address } = await getAddress();
    const { network, networkPassphrase } = await getNetwork();
    return { connected: true, publicKey: address, network, networkPassphrase, walletType: "freighter" };
  } catch {
    return { connected: false, publicKey: null, network: null, networkPassphrase: null, walletType: null };
  }
}

export async function connectWallet(
  type: WalletType
): Promise<{ state: WalletState | null; error?: WalletError }> {
  try {
    switch (type) {
      case "freighter": {
        const { isConnected: connected } = await isConnected();
        if (!connected) {
          return {
            state: null,
            error: { type: "WALLET_NOT_FOUND", wallet: "freighter", message: "Freighter extension not installed. Install it from freighter.app" },
          };
        }
        await setAllowed();
        const { address } = await requestAccess();
        const { network, networkPassphrase } = await getNetwork();
        return { state: { connected: true, publicKey: address, network, networkPassphrase, walletType: "freighter" } };
      }

      case "xbull": {
        if (typeof window === "undefined" || !window.xBullSDK) {
          return {
            state: null,
            error: { type: "WALLET_NOT_FOUND", wallet: "xbull", message: "xBull wallet not detected. Install it from xbull.app" },
          };
        }
        const resp = await window.xBullSDK.connect();
        return { state: { connected: true, publicKey: resp.address, network: resp.network, networkPassphrase: resp.networkPassphrase, walletType: "xbull" } };
      }

      case "albedo": {
        return {
          state: null,
          error: { type: "WALLET_NOT_FOUND", wallet: "albedo", message: "Albedo wallet integration coming soon" },
        };
      }

      default:
        return { state: null, error: { type: "WALLET_NOT_FOUND", wallet: type, message: "Unknown wallet type" } };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("denied")) {
      return { state: null, error: { type: "USER_REJECTED", message: "User rejected the wallet connection" } };
    }
    return { state: null, error: { type: "WALLET_NOT_FOUND", wallet: type, message: msg } };
  }
}

export async function getBalance(publicKey: string): Promise<string> {
  try {
    const server = new Horizon.Server("https://horizon-testnet.stellar.org");
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
  walletType: WalletType
): Promise<{ success: boolean; hash?: string; error?: WalletError }> {
  try {
    const server = new Horizon.Server("https://horizon-testnet.stellar.org");
    const sourceAccount = await server.loadAccount(sourcePublicKey);

    const balance = sourceAccount.balances.find((b) => b.asset_type === "native");
    const have = Number.parseFloat(balance?.balance ?? "0");
    const need = Number.parseFloat(amount);
    if (need > have) {
      return {
        success: false,
        error: {
          type: "INSUFFICIENT_BALANCE",
          required: amount,
          have: balance?.balance ?? "0",
          message: `Insufficient XLM balance. Required: ${amount}, Available: ${balance?.balance ?? "0"}`,
        },
      };
    }

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

    const { signedTxXdr } = await signSorobanTx(
      walletType,
      transaction.toXDR(),
      Networks.TESTNET
    );

    const tx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
    const result = await server.submitTransaction(tx);
    return { success: true, hash: result.hash };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transaction failed";
    if (msg.includes("reject") || msg.includes("denied")) {
      return { success: false, error: { type: "USER_REJECTED", message: "User rejected the transaction" } };
    }
    return {
      success: false,
      error: { type: "TRANSACTION_FAILED", message: msg },
    };
  }
}

export function signSorobanTx(walletType: WalletType, xdr: string, networkPassphrase: string): Promise<{ signedTxXdr: string }> {
  if (walletType === "freighter") {
    return signTransaction(xdr, { networkPassphrase });
  }
  if (walletType === "xbull" && typeof window !== "undefined" && window.xBullSDK) {
    return window.xBullSDK.sign(xdr);
  }
  return signTransaction(xdr, { networkPassphrase });
}
