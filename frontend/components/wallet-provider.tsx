"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { checkConnection, connectWallet, getBalance, sendXLM, type WalletState } from "@/lib/stellar";

interface WalletContextValue {
  wallet: WalletState;
  balance: string;
  loading: boolean;
  connect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  send: (destination: string, amount: string) => Promise<{ success: boolean; hash?: string; error?: string }>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    publicKey: null,
    network: null,
    networkPassphrase: null,
  });
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnection().then((state) => {
      setWallet(state);
      if (state.connected && state.publicKey) {
        getBalance(state.publicKey).then(setBalance);
      }
    });
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    const state = await connectWallet();
    if (state) {
      setWallet(state);
      if (state.publicKey) {
        const bal = await getBalance(state.publicKey);
        setBalance(bal);
      }
    }
    setLoading(false);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (wallet.publicKey) {
      const bal = await getBalance(wallet.publicKey);
      setBalance(bal);
    }
  }, [wallet.publicKey]);

  const send = useCallback(
    async (destination: string, amount: string) => {
      if (!wallet.publicKey) {
        return { success: false, error: "Wallet not connected" };
      }
      const result = await sendXLM(wallet.publicKey, destination, amount);
      if (result.success) {
        await refreshBalance();
      }
      return result;
    },
    [wallet.publicKey, refreshBalance],
  );

  return (
    <WalletContext.Provider
      value={{ wallet, balance, loading, connect, refreshBalance, send }}
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
