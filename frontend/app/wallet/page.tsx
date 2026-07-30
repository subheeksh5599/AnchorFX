"use client";

import { useWallet } from "@/components/wallet-provider";
import { useState, useCallback, type FormEvent, type ReactNode } from "react";
import { ExternalLink, Shield, Zap, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { WalletType } from "@/lib/multi-wallet";
import { validateStellarAddress, validateXlmAmount } from "@/lib/validation";
import { createEscrow, counterpartyApprove } from "@/lib/contract-client";
import { CONTRACT_ID } from "@/lib/env";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 12)}...${addr.slice(-8)}`;
}

const WALLET_OPTIONS: { type: WalletType; label: string; icon: string }[] = [
  { type: "freighter", label: "Freighter", icon: "" },
  { type: "xbull", label: "xBull", icon: "" },
];

type EscrowStatus =
  | "idle"
  | "creating"
  | "created"
  | "approved"
  | "settling"
  | "settled"
  | "error";

export default function WalletPage(): ReactNode {
  const {
    wallet,
    balance,
    loading,
    error,
    availableWallets,
    connect,
    disconnect,
    refreshBalance,
    send,
  } = useWallet();
  const [copied, setCopied] = useState(false);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [txResult, setTxResult] = useState<{
    success: boolean;
    hash?: string;
    error?: string;
  } | null>(null);

  // Escrow state
  const [escrowReceiver, setEscrowReceiver] = useState(
    wallet.publicKey
      ? ""
      : "GDHMIQXJITKCXJ5IREK4MUEJKLSZVA6XKBF25WKVN3REC6OMMNENYSK5"
  );
  const [escrowAmount, setEscrowAmount] = useState("0.1");
  const [escrowStatus, setEscrowStatus] = useState<EscrowStatus>("idle");
  const [escrowId, setEscrowId] = useState<number | null>(null);
  const [escrowHash, setEscrowHash] = useState("");
  const [escrowError, setEscrowError] = useState("");

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
        ...(result.error?.message !== undefined && {
          error: result.error.message,
        }),
      });
      setSending(false);
      if (result.success) {
        setDestination("");
        setAmount("");
      }
    },
    [destination, amount, send]
  );

  const handleCreateEscrow = useCallback(async () => {
    if (!wallet.publicKey || !wallet.walletType) return;
    setEscrowStatus("creating");
    setEscrowError("");
    try {
      const result = await createEscrow(
        wallet.publicKey,
        wallet.walletType,
        CONTRACT_ID,
        escrowReceiver || wallet.publicKey,
        "XLM",
        BigInt(Math.floor(parseFloat(escrowAmount) * 10_000_000)),
        100000,
        1,
        (s) => {
          if (s.status === "failed" && s.error) setEscrowError(s.error);
        },
        true // sponsored
      );
      if (result.status === "success" && result.hash) {
        setEscrowHash(result.hash);
        setEscrowStatus("created");
        // Assume escrow ID is count + 1
        setEscrowId(1);
      } else {
        setEscrowStatus("error");
        setEscrowError("Escrow creation failed");
      }
    } catch (e: any) {
      setEscrowStatus("error");
      setEscrowError(e.message?.slice(0, 200) || "Unknown error");
    }
  }, [wallet, escrowReceiver, escrowAmount]);

  const handleApprove = useCallback(async () => {
    if (!wallet.publicKey || !wallet.walletType || !escrowId) return;
    setEscrowStatus("approved");
    try {
      await counterpartyApprove(
        wallet.publicKey,
        wallet.walletType,
        CONTRACT_ID,
        escrowId,
        () => {},
        true
      );
    } catch (e: any) {
      setEscrowError(e.message?.slice(0, 200));
    }
  }, [wallet, escrowId]);

  const isMainnet = wallet.network === "PUBLIC";
  const balanceNum = Number.parseFloat(balance);

  return (
    <main id="main" className="min-h-screen bg-black font-mono text-white">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-5 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto]"
        >
          <div>
            <h1 className="mb-3 text-[2.5rem] leading-[0.9] font-bold tracking-[-0.04em] uppercase">
              Wallet
            </h1>
            <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase">
              Stellar {isMainnet ? "Mainnet" : "Testnet"} · Freighter · xBull
            </div>
          </div>
          <div className="flex items-end">
            <Link
              href="/contract"
              className="group flex items-center gap-2 border-b border-neutral-800 pb-1 text-xs tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Contract{" "}
              <span className="text-neutral-600 transition-colors group-hover:text-red-400">
                →
              </span>
            </Link>
          </div>
        </motion.div>
        <hr className="mb-12 border-neutral-800" />

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-10 border border-red-400/30 p-5 text-sm"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-red-400">◆</span>
              <div>
                <p className="mb-1 text-xs font-bold tracking-wider text-red-400 uppercase">
                  {error.type.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-neutral-400">{error.message}</p>
              </div>
            </div>
          </motion.div>
        )}

        {!wallet.connected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="border border-neutral-800 p-12 text-center"
          >
            <div className="mb-8 text-[10rem] leading-none font-black text-neutral-900 select-none">
              ◆
            </div>
            <h2 className="mb-6 text-lg font-bold tracking-[0.3em] uppercase">
              Connect Wallet
            </h2>
            <p className="mx-auto mb-10 max-w-md text-xs leading-relaxed tracking-wide text-neutral-500">
              Choose a Stellar wallet to interact with AnchorFX on mainnet.
            </p>
            <div className="mx-auto grid max-w-sm grid-cols-1 gap-3 sm:grid-cols-2">
              {WALLET_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => connect(opt.type)}
                  disabled={loading}
                  className={`px-6 py-4 text-xs font-bold tracking-[0.2em] uppercase transition-all duration-150 disabled:opacity-30 ${
                    availableWallets.includes(opt.type)
                      ? "border border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10"
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
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Wallet info */}
            <div className="grid grid-cols-[1fr_auto_auto] items-end gap-4 border-b border-neutral-800 pb-6">
              <div>
                <div className="mb-1 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                  Wallet
                </div>
                <div className="text-sm tracking-wider uppercase">
                  {wallet.walletType}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                  Network
                </div>
                <div
                  className={`text-sm tracking-wider uppercase ${isMainnet ? "text-green-400" : "text-amber-400"}`}
                >
                  {wallet.network ?? "Unknown"}
                </div>
              </div>
              <button
                onClick={disconnect}
                className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-red-400"
              >
                Disconnect
              </button>
            </div>

            <div className="border border-neutral-800 p-5">
              <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                Address
              </div>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-sm break-all text-neutral-300">
                  {wallet.publicKey}
                </code>
                <button
                  onClick={copyAddress}
                  className="shrink-0 text-xs tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:text-white"
                >
                  {copied ? "COPIED" : "COPY"}
                </button>
              </div>
            </div>

            <div className="border border-neutral-800 p-8">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                  Balance
                </span>
                <button
                  onClick={refreshBalance}
                  className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-white"
                >
                  Refresh
                </button>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-6xl font-black tracking-[-0.03em] tabular-nums">
                  {balanceNum.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 6,
                  })}
                </span>
                <span className="text-lg font-bold text-neutral-600 uppercase">
                  XLM
                </span>
              </div>
            </div>

            {/* ======== ESCROW SECTION ======== */}
            <div className="border border-neutral-800 p-8">
              <div className="mb-6 flex items-center gap-3">
                <Shield className="h-4 w-4 text-red-400" />
                <h3 className="text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
                  Create Escrow
                </h3>
              </div>

              {/* Flow indicator */}
              <div className="mb-8 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase">
                <span
                  className={
                    escrowStatus === "idle" ? "text-white" : "text-neutral-600"
                  }
                >
                  1. Fill
                </span>
                <span className="text-neutral-800">→</span>
                <span
                  className={
                    escrowStatus === "creating"
                      ? "text-amber-400"
                      : escrowStatus === "created"
                        ? "text-white"
                        : "text-neutral-600"
                  }
                >
                  2. Lock
                </span>
                <span className="text-neutral-800">→</span>
                <span
                  className={
                    escrowStatus === "approved"
                      ? "text-amber-400"
                      : escrowStatus === "settling" ||
                          escrowStatus === "settled"
                        ? "text-white"
                        : "text-neutral-600"
                  }
                >
                  3. Approve
                </span>
                <span className="text-neutral-800">→</span>
                <span
                  className={
                    escrowStatus === "settled"
                      ? "text-green-400"
                      : "text-neutral-600"
                  }
                >
                  4. Settle
                </span>
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                    Receiver Address
                  </label>
                  <input
                    type="text"
                    value={escrowReceiver}
                    onChange={(e) => setEscrowReceiver(e.target.value)}
                    placeholder="G..."
                    disabled={escrowStatus !== "idle"}
                    className="w-full border-b border-neutral-800 bg-transparent py-3 text-sm tracking-wide text-white transition-colors outline-none placeholder:text-neutral-700 focus:border-white disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                    Amount (XLM)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={escrowAmount}
                    onChange={(e) => setEscrowAmount(e.target.value)}
                    disabled={escrowStatus !== "idle"}
                    className="w-full border-b border-neutral-800 bg-transparent py-3 text-sm tracking-wide text-white transition-colors outline-none placeholder:text-neutral-700 focus:border-white disabled:opacity-40"
                  />
                </div>
              </div>

              {escrowStatus === "idle" && (
                <button
                  onClick={handleCreateEscrow}
                  className="w-full bg-red-600 py-4 text-xs font-bold tracking-[0.3em] text-white uppercase transition-colors hover:bg-red-500"
                >
                  <Zap className="mr-2 inline h-3 w-3" />
                  Lock Funds in Escrow
                </button>
              )}

              {escrowStatus === "creating" && (
                <div className="border border-amber-400/20 bg-amber-400/5 py-4 text-center">
                  <p className="animate-pulse text-xs tracking-[0.2em] text-amber-400 uppercase">
                    Confirming on chain...
                  </p>
                  <p className="mt-2 text-[10px] text-neutral-500">
                    Sign the Freighter prompt to create escrow
                  </p>
                </div>
              )}

              {(escrowStatus === "created" || escrowStatus === "approved") && (
                <div className="space-y-4">
                  <div className="border border-green-400/20 bg-green-400/5 p-4 text-center">
                    <CheckCircle className="mx-auto mb-2 h-5 w-5 text-green-400" />
                    <p className="text-xs font-bold tracking-[0.2em] text-green-400 uppercase">
                      Escrow #{escrowId} Created
                    </p>
                    {escrowHash && (
                      <a
                        href={`https://stellar.expert/explorer/public/tx/${escrowHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[10px] text-neutral-500 hover:text-white"
                      >
                        View on Explorer <ExternalLink className="h-2 w-2" />
                      </a>
                    )}
                  </div>
                  {escrowStatus === "approved" ? (
                    <div className="border border-amber-400/20 bg-amber-400/5 p-4 text-center">
                      <p className="text-xs tracking-[0.2em] text-amber-400 uppercase">
                        Awaiting settlement...
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleApprove}
                      className="w-full bg-white py-4 text-xs font-bold tracking-[0.3em] text-black uppercase transition-colors hover:bg-neutral-200"
                    >
                      Approve Escrow
                    </button>
                  )}
                </div>
              )}

              {escrowStatus === "settling" && (
                <div className="border border-amber-400/20 bg-amber-400/5 py-4 text-center">
                  <p className="animate-pulse text-xs tracking-[0.2em] text-amber-400 uppercase">
                    Settling...
                  </p>
                </div>
              )}

              {escrowStatus === "settled" && (
                <div className="border border-green-400/20 bg-green-400/5 p-6 text-center">
                  <CheckCircle className="mx-auto mb-3 h-8 w-8 text-green-400" />
                  <p className="text-sm font-bold tracking-[0.2em] text-green-400 uppercase">
                    Settled ✓
                  </p>
                  <p className="mt-2 text-[10px] text-neutral-500">
                    Funds released. Escrow complete.
                  </p>
                </div>
              )}

              {escrowStatus === "error" && (
                <div className="border border-red-400/20 bg-red-400/5 p-4 text-center">
                  <p className="text-xs tracking-[0.2em] text-red-400 uppercase">
                    Error
                  </p>
                  <p className="mt-1 text-[10px] text-neutral-400">
                    {escrowError}
                  </p>
                  <button
                    onClick={() => {
                      setEscrowStatus("idle");
                      setEscrowError("");
                    }}
                    className="mt-3 text-xs text-white underline underline-offset-4 hover:text-red-400"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Send form */}
            <div className="border border-neutral-800 p-8">
              <h3 className="mb-6 text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
                Send XLM
              </h3>
              <form onSubmit={handleSend} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
                  <div>
                    <label className="mb-2 block text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                      Destination
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="G..."
                      required
                      className="w-full border-b border-neutral-800 bg-transparent py-3 text-sm tracking-wide text-white transition-colors outline-none placeholder:text-neutral-700 focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
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
                      className="w-full border-b border-neutral-800 bg-transparent py-3 text-sm tracking-wide text-white transition-colors outline-none placeholder:text-neutral-700 focus:border-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={sending || !destination || !amount}
                  className="w-full bg-white py-4 text-xs font-bold tracking-[0.3em] text-black uppercase transition-colors hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
              {txResult && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-6 border-l-4 p-5 ${txResult.success ? "border-green-400 bg-green-400/5" : "border-red-400 bg-red-400/5"}`}
                >
                  <p
                    className={`mb-1 text-xs font-bold tracking-[0.2em] uppercase ${txResult.success ? "text-green-400" : "text-red-400"}`}
                  >
                    {txResult.success ? "Success" : "Failed"}
                  </p>
                  {txResult.success && txResult.hash ? (
                    <a
                      href={`https://stellar.expert/explorer/public/tx/${txResult.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-neutral-500 transition-colors hover:text-white"
                    >
                      {shortAddr(txResult.hash)}{" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-xs text-neutral-400">{txResult.error}</p>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        <div className="mt-20 text-center">
          <Link
            href="/"
            className="text-[10px] tracking-[0.3em] text-neutral-700 uppercase transition-colors hover:text-neutral-500"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
