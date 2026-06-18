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
  AlertTriangle,
  CircleDollarSign,
  Activity,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { WalletType } from "@/lib/multi-wallet";
import { validateStellarAddress, validateXlmAmount } from "@/lib/validation";

const easeOut = [0.16, 1, 0.3, 1] as const;

function shortAddr(addr: string): string {
  return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
}

const WALLET_OPTIONS: { type: WalletType; label: string; icon: string }[] = [
  { type: "freighter", label: "Freighter", icon: "🦊" },
  { type: "xbull", label: "xBull", icon: "🐂" },
];

export default function WalletPage(): ReactNode {
  const { wallet, balance, loading, error, availableWallets, connect, disconnect, refreshBalance, send } =
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

      const addrResult = validateStellarAddress(destination);
      const amtResult = validateXlmAmount(amount);
      if (!addrResult.valid) {
        setTxResult({ success: false, error: addrResult.error });
        return;
      }
      if (!amtResult.valid) {
        setTxResult({ success: false, error: amtResult.error });
        return;
      }

      setSending(true);
      setTxResult(null);
      const result = await send(addrResult.sanitized!, amtResult.sanitized!);
      setTxResult({
        success: result.success,
        ...(result.hash !== undefined && { hash: result.hash }),
        ...(result.error?.message !== undefined && { error: result.error.message }),
      });
      setSending(false);
      if (result.success) {
        setDestination("");
        setAmount("");
      }
    },
    [destination, amount, send],
  );

  const isTestnet = wallet.network === "TESTNET";
  const balanceNum = Number.parseFloat(balance);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Grid background */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <CircleDollarSign className="h-6 w-6 text-amber-400" />
              <h1 className="text-2xl font-medium tracking-tight">AnchorFX Wallet</h1>
            </div>
            <p className="text-sm text-neutral-500 font-mono">STELLAR TESTNET · FREIGHTER · XBULL</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/contract"
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-amber-400 transition-colors px-3 py-1.5 rounded-md border border-neutral-800 hover:border-amber-400/30"
            >
              <Activity className="h-3.5 w-3.5" />
              Smart Contract
            </Link>
          </div>
        </motion.div>

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 border border-red-500/20 bg-red-500/5 rounded-lg px-4 py-3 flex items-start gap-3"
          >
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-400">{error.type.replace(/_/g, " ")}</p>
              <p className="text-neutral-400 mt-0.5">{error.message}</p>
            </div>
          </motion.div>
        )}

        {!wallet.connected ? (
          /* --- CONNECT STATE --- */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut, delay: 0.1 }}
          >
            <div className="border border-neutral-800 rounded-2xl p-10 text-center bg-neutral-900/50 backdrop-blur">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-800 mb-6">
                <Wallet className="h-7 w-7 text-neutral-400" />
              </div>
              <h2 className="text-xl font-medium mb-2">Connect your wallet</h2>
              <p className="text-neutral-500 text-sm max-w-sm mx-auto mb-8">
                Choose a Stellar wallet to interact with AnchorFX on testnet.
                Install{" "}
                <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                  Freighter
                </a>{" "}
                or{" "}
                <a href="https://xbull.app" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                  xBull
                </a>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto">
                {WALLET_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => connect(opt.type)}
                    disabled={loading}
                    className={`flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-medium transition-all duration-200 disabled:opacity-50 border ${
                      availableWallets.includes(opt.type)
                        ? "border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10 hover:border-amber-400/50 text-amber-200"
                        : "border-neutral-800 bg-neutral-900 text-neutral-500"
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    {opt.label}
                    {availableWallets.includes(opt.type) ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-600 mt-4">
                Green dot = wallet detected in browser
              </p>
            </div>
          </motion.div>
        ) : (
          /* --- CONNECTED STATE --- */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="space-y-4"
          >
            {/* Top row: Address + Network */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
              {/* Address card */}
              <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 backdrop-blur p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium">
                    {wallet.walletType}
                  </span>
                  <button
                    onClick={disconnect}
                    className="text-[11px] text-neutral-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                  >
                    Disconnect
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <code className="text-sm text-neutral-200 font-mono truncate flex-1">
                    {wallet.publicKey}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="shrink-0 p-2 rounded-lg border border-neutral-700 hover:border-neutral-500 transition-colors text-neutral-400 hover:text-neutral-200"
                    aria-label="Copy address"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Network badge */}
              <div className={`border rounded-xl p-5 flex flex-col justify-center min-w-[140px] ${
                isTestnet
                  ? "border-amber-400/20 bg-amber-400/5"
                  : "border-green-400/20 bg-green-400/5"
              }`}>
                <span className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium mb-1">Network</span>
                <span className={`text-sm font-mono font-medium ${
                  isTestnet ? "text-amber-400" : "text-green-400"
                }`}>
                  {wallet.network ?? "Unknown"}
                </span>
              </div>
            </div>

            {/* Balance card */}
            <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 backdrop-blur p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium">XLM Balance</span>
                <button
                  onClick={refreshBalance}
                  className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Refresh
                </button>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-light tracking-tight tabular-nums">
                  {balanceNum.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 6,
                  })}
                </span>
                <span className="text-xl text-neutral-500 font-light">XLM</span>
              </div>
              {isTestnet && balanceNum === 0 && (
                <a
                  href="https://laboratory.stellar.org/#account-creator?network=test"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Fund with Friendbot <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Send form */}
            <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 backdrop-blur p-6">
              <div className="flex items-center gap-2 mb-5">
                <Send className="h-4 w-4 text-neutral-500" />
                <h3 className="text-sm font-medium tracking-wide uppercase text-neutral-300">Send XLM</h3>
              </div>
              <form onSubmit={handleSend} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium block mb-1.5">
                      Destination
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="G..."
                      required
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm font-mono text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium block mb-1.5">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                      required
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm font-mono text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={sending || !destination || !amount}
                  className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-black font-medium py-3 px-6 text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send XLM</>
                  )}
                </button>
              </form>

              {/* TX Result */}
              {txResult && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 rounded-lg px-4 py-3 text-sm border ${
                    txResult.success
                      ? "border-green-400/20 bg-green-400/5 text-green-400"
                      : "border-red-400/20 bg-red-400/5 text-red-400"
                  }`}
                >
                  <p className="font-medium mb-1">
                    {txResult.success ? "Transaction Successful" : "Transaction Failed"}
                  </p>
                  {txResult.success && txResult.hash ? (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${txResult.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-neutral-200 transition-colors font-mono text-xs"
                    >
                      {shortAddr(txResult.hash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-neutral-400">{txResult.error}</p>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Back to home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
