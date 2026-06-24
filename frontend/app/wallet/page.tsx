"use client";

import { useWallet } from "@/components/wallet-provider";
import { useState, useCallback, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { WalletType } from "@/lib/multi-wallet";
import { validateStellarAddress, validateXlmAmount } from "@/lib/validation";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 12)}...${addr.slice(-8)}`;
}

const WALLET_OPTIONS: { type: WalletType; label: string; icon: string }[] = [
  { type: "freighter", label: "Freighter", icon: "" },
  { type: "xbull", label: "xBull", icon: "" },
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
    <main id="main" className="min-h-screen bg-black text-white font-mono">
      {/* Grid overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-16">
        {/* Header — architectural, split layout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 mb-16"
        >
          <div>
            <h1 className="text-[2.5rem] font-bold leading-[0.9] tracking-[-0.04em] uppercase mb-3">
              Wallet
            </h1>
            <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              Stellar Testnet · Freighter · xBull
            </div>
          </div>
          <div className="flex items-end">
            <Link
              href="/contract"
              className="group text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-red-400 transition-colors flex items-center gap-2 pb-1 border-b border-neutral-800 hover:border-red-400"
            >
              Contract
              <span className="text-neutral-600 group-hover:text-red-400 transition-colors">→</span>
            </Link>
          </div>
        </motion.div>

        {/* Horizontal rule */}
        <hr className="border-neutral-800 mb-12" />

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-10 border border-red-400/30 p-5 text-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">◆</span>
              <div>
                <p className="text-red-400 uppercase tracking-wider text-xs font-bold mb-1">
                  {error.type.replace(/_/g, " ")}
                </p>
                <p className="text-neutral-400 text-xs">{error.message}</p>
              </div>
            </div>
          </motion.div>
        )}

        {!wallet.connected ? (
          /* CONNECT STATE */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="border border-neutral-800 p-12 text-center"
          >
            <div className="text-[10rem] leading-none font-black text-neutral-900 mb-8 select-none">◆</div>
            <h2 className="text-lg uppercase tracking-[0.3em] font-bold mb-6">Connect Wallet</h2>
            <p className="text-neutral-500 text-xs max-w-md mx-auto mb-10 leading-relaxed tracking-wide">
              Choose a Stellar wallet to interact with AnchorFX on testnet.
              Install{" "}
              <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="text-white hover:text-red-400 underline underline-offset-4">
                Freighter
              </a>{" "}
              or{" "}
              <a href="https://xbull.app" target="_blank" rel="noopener noreferrer" className="text-white hover:text-red-400 underline underline-offset-4">
                xBull
              </a>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto">
              {WALLET_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => connect(opt.type)}
                  disabled={loading}
                  className={`text-xs uppercase tracking-[0.2em] font-bold py-4 px-6 transition-all duration-150 disabled:opacity-30 ${
                    availableWallets.includes(opt.type)
                      ? "border border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white"
                      : "border border-neutral-800 text-neutral-600"
                  }`}
                >
                  {opt.label}
                  {availableWallets.includes(opt.type) ? (
                    <span className="ml-2 text-green-400">●</span>
                  ) : (
                    <span className="ml-2 text-neutral-700">○</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-neutral-700 mt-6 tracking-wider uppercase">
              Green dot = detected in browser
            </p>
          </motion.div>
        ) : (
          /* CONNECTED STATE */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Top bar: type + network + disconnect */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-end pb-6 border-b border-neutral-800">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-1">Wallet</div>
                <div className="text-sm uppercase tracking-wider">{wallet.walletType}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-1">Network</div>
                <div className={`text-sm uppercase tracking-wider ${isTestnet ? "text-amber-400" : "text-green-400"}`}>
                  {wallet.network ?? "Unknown"}
                </div>
              </div>
              <button
                onClick={disconnect}
                className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 hover:text-red-400 transition-colors"
              >
                Disconnect
              </button>
            </div>

            {/* Address row */}
            <div className="border border-neutral-800 p-5">
              <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-2">Address</div>
              <div className="flex items-center gap-3">
                <code className="text-sm text-neutral-300 flex-1 break-all">{wallet.publicKey}</code>
                <button
                  onClick={copyAddress}
                  className="text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-white transition-colors shrink-0"
                >
                  {copied ? "COPIED" : "COPY"}
                </button>
              </div>
            </div>

            {/* Balance — big number, no decoration */}
            <div className="border border-neutral-800 p-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Balance</span>
                <button
                  onClick={refreshBalance}
                  className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 hover:text-white transition-colors"
                >
                  Refresh
                </button>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-6xl font-black tabular-nums tracking-[-0.03em]">
                  {balanceNum.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 6,
                  })}
                </span>
                <span className="text-lg font-bold uppercase text-neutral-600">XLM</span>
              </div>
              {isTestnet && balanceNum === 0 && (
                <a
                  href="https://laboratory.stellar.org/#account-creator?network=test"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-xs uppercase tracking-[0.2em] text-red-400 hover:text-red-300 transition-colors"
                >
                  Fund with Friendbot <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Send form — brutalist, minimal */}
            <div className="border border-neutral-800 p-8">
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400 mb-6">Send XLM</h3>
              <form onSubmit={handleSend} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 block mb-2">
                      Destination
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="G..."
                      required
                      className="w-full bg-transparent border-b border-neutral-800 focus:border-white outline-none py-3 text-sm text-white placeholder:text-neutral-700 tracking-wide transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 block mb-2">
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
                      className="w-full bg-transparent border-b border-neutral-800 focus:border-white outline-none py-3 text-sm text-white placeholder:text-neutral-700 tracking-wide transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={sending || !destination || !amount}
                  className="w-full bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600 text-black font-bold uppercase tracking-[0.3em] text-xs py-4 transition-colors"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>

              {/* TX Result */}
              {txResult && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-6 p-5 border-l-4 ${
                    txResult.success
                      ? "border-green-400 bg-green-400/5"
                      : "border-red-400 bg-red-400/5"
                  }`}
                >
                  <p className={`text-xs uppercase tracking-[0.2em] font-bold mb-1 ${
                    txResult.success ? "text-green-400" : "text-red-400"
                  }`}>
                    {txResult.success ? "Success" : "Failed"}
                  </p>
                  {txResult.success && txResult.hash ? (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${txResult.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-xs"
                    >
                      {shortAddr(txResult.hash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-neutral-400 text-xs">{txResult.error}</p>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        <div className="mt-20 text-center">
          <Link
            href="/"
            className="text-[10px] uppercase tracking-[0.3em] text-neutral-700 hover:text-neutral-500 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
