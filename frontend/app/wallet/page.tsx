"use client";

import { useWallet } from "@/components/wallet-provider";
import { useState, useCallback, type FormEvent, type ReactNode } from "react";
import {
  Wallet,
  Copy,
  Check,
  Send,
  ArrowUpRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

const easeOut = [0.16, 1, 0.3, 1] as const;

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletPage(): ReactNode {
  const { wallet, balance, loading, connect, refreshBalance, send } =
    useWallet();
  const [copied, setCopied] = useState(false);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [txResult, setTxResult] = useState<{
    success: boolean;
    hash?: string;
    error?: string;
  } | null>(null);

  const copyAddress = useCallback(() => {
    if (wallet.publicKey) {
      navigator.clipboard.writeText(wallet.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [wallet.publicKey]);

  const handleSend = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!destination || !amount) return;
      setSending(true);
      setTxResult(null);
      const result = await send(destination, amount);
      setTxResult(result);
      setSending(false);
      if (result.success) {
        setDestination("");
        setAmount("");
      }
    },
    [destination, amount, send],
  );

  const isTestnet = wallet.network === "TESTNET";

  return (
    <main className="flex min-h-screen flex-col items-center px-6 pt-32 pb-24">
      <div className="w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
              AnchorFX Wallet
            </h1>
            <p className="text-muted-foreground mt-2">
              Stellar Testnet — Connect Freighter to send XLM
            </p>
          </div>

          {!wallet.connected ? (
            <div className="bg-muted rounded-2xl p-8 text-center">
              <Wallet className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h2 className="mb-2 text-xl font-medium">Connect your wallet</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Install{" "}
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  Freighter
                </a>{" "}
                and connect to Stellar Testnet to get started.
              </p>
              <button
                onClick={connect}
                disabled={loading}
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-2 rounded-md px-6 py-3 font-medium transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                {loading ? "Connecting..." : "Connect Freighter"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Wallet card */}
              <div className="bg-muted rounded-2xl p-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-muted-foreground text-sm font-medium uppercase">
                    Connected Wallet
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isTestnet
                        ? "bg-accent/20 text-amber-600 dark:text-amber-400"
                        : "bg-green-500/10 text-green-600 dark:text-green-400"
                    }`}
                  >
                    {wallet.network ?? "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <code className="text-foreground flex-1 truncate text-sm">
                    {wallet.publicKey}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Copy address"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Balance card */}
              <div className="bg-muted rounded-2xl p-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-muted-foreground text-sm font-medium uppercase">
                    XLM Balance
                  </span>
                  <button
                    onClick={refreshBalance}
                    className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                  >
                    Refresh
                  </button>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    {Number.parseFloat(balance).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 4,
                    })}
                  </span>
                  <span className="text-muted-foreground text-lg">XLM</span>
                </div>
                {isTestnet && Number.parseFloat(balance) === 0 && (
                  <a
                    href="https://laboratory.stellar.org/#account-creator?network=test"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent mt-3 inline-flex items-center gap-1 text-sm"
                  >
                    Fund with Friendbot <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Send form */}
              <form
                onSubmit={handleSend}
                className="bg-muted rounded-2xl p-6"
              >
                <h3 className="mb-4 text-lg font-medium">Send XLM</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-muted-foreground mb-1 block text-sm">
                      Destination Address
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="G..."
                      required
                      className="bg-background border-border focus:border-ring w-full rounded-md border px-3 py-2.5 text-sm outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 block text-sm">
                      Amount (XLM)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                      required
                      className="bg-background border-border focus:border-ring w-full rounded-md border px-3 py-2.5 text-sm outline-none transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !destination || !amount}
                    className="bg-foreground text-background hover:bg-foreground/90 inline-flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 font-medium transition-colors disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {sending ? "Sending..." : "Send XLM"}
                  </button>
                </div>

                {/* Transaction result */}
                {txResult && (
                  <div
                    className={`mt-4 rounded-md p-4 text-sm ${
                      txResult.success
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {txResult.success ? (
                      <div>
                        <p className="mb-1 font-medium">
                          Transaction Successful
                        </p>
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${txResult.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 underline underline-offset-4"
                        >
                          {shortAddr(txResult.hash!)}{" "}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-1 font-medium">Transaction Failed</p>
                        <p>{txResult.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
