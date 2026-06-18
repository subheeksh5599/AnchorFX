"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  checkConnection,
  connectWallet,
  getBalance,
  sendXLM,
  getAvailableWallets,
  type WalletState,
  type WalletType,
  type WalletError,
} from "@/lib/multi-wallet";

interface WalletContextValue {
  wallet: WalletState;
  balance: string;
  loading: boolean;
  error: WalletError | null;
  availableWallets: WalletType[];
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  send: (destination: string, amount: string) => Promise<{
    success: boolean;
    hash?: string;
    error?: WalletError;
  }>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    publicKey: null,
    network: null,
    networkPassphrase: null,
    walletType: null,
  });
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<WalletError | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletType[]>([]);

  useEffect(() => {
    getAvailableWallets().then(setAvailableWallets);
    checkConnection().then((state) => {
      setWallet(state);
      if (state.connected && state.publicKey) {
        getBalance(state.publicKey).then(setBalance);
      }
    });
  }, []);

  const connect = useCallback(async (type: WalletType) => {
    setLoading(true);
    setError(null);
    const result = await connectWallet(type);
    if (result.state) {
      setWallet(result.state);
      if (result.state.publicKey) {
        const bal = await getBalance(result.state.publicKey);
        setBalance(bal);
      }
    }
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      connected: false,
      publicKey: null,
      network: null,
      networkPassphrase: null,
      walletType: null,
    });
    setBalance("0");
    setError(null);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (wallet.publicKey) {
      const bal = await getBalance(wallet.publicKey);
      setBalance(bal);
      setError(null);
    }
  }, [wallet.publicKey]);

  const send = useCallback(
    async (destination: string, amount: string) => {
      if (!wallet.publicKey || !wallet.walletType) {
        return { success: false, error: { type: "WALLET_NOT_FOUND" as const, wallet: "freighter" as const, message: "Wallet not connected" } };
      }
      const result = await sendXLM(wallet.publicKey, destination, amount, wallet.walletType);
      if (result.success) {
        await refreshBalance();
      }
      if (result.error) {
        setError(result.error);
      }
      return { success: result.success, hash: result.hash, error: result.error };
    },
    [wallet.publicKey, wallet.walletType, refreshBalance],
  );

  return (
    <WalletContext.Provider
      value={{ wallet, balance, loading, error, availableWallets, connect, disconnect, refreshBalance, send }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}
