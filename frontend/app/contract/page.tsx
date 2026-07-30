"use client";

import { useWallet } from "@/components/wallet-provider";
import { useState, useCallback, type ReactNode } from "react";
import {
  deployContract,
  getEscrowFromContract,
  trackTransaction,
  subscribeContractEvents,
  type TxStatus,
  type EscrowData,
} from "@/lib/contract-client";
import { ExternalLink, RadioTower, Clock, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { validateContractId } from "@/lib/validation";

function short(str: string, n = 14): string {
  return str.length > n * 2 ? `${str.slice(0, n)}...${str.slice(-6)}` : str;
}

export default function ContractPage(): ReactNode {
  const { wallet } = useWallet();
  const [viewContractId, setViewContractId] = useState(
    "CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26"
  );
  const [status, setStatus] = useState<TxStatus | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [escrowData, setEscrowData] = useState<EscrowData | null>(null);
  const [reading, setReading] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [liveLedger, setLiveLedger] = useState<number | null>(null);

  const handleDeploy = useCallback(async () => {
    if (!wallet.publicKey || !wallet.walletType) return;
    setDeploying(true);
    setStatus(null);

    const result = await deployContract(
      wallet.publicKey,
      wallet.walletType,
      setStatus
    );

    if (result.contractId) setViewContractId(result.contractId);
    setStatus(result);
    setDeploying(false);

    if (result.hash) trackTransaction(result.hash, (s) => setStatus(s));
  }, [wallet.publicKey, wallet.walletType]);

  const handleReadContract = useCallback(async () => {
    if (!viewContractId) return;
    const validation = validateContractId(viewContractId);
    if (!validation.valid) {
      setStatus({ status: "failed", error: validation.error });
      return;
    }
    setReading(true);
    setEscrowData(await getEscrowFromContract(validation.sanitized!));
    setReading(false);
  }, [viewContractId]);

  const handleListen = useCallback(() => {
    if (!viewContractId || listening) return;
    const validation = validateContractId(viewContractId);
    if (!validation.valid) {
      setStatus({ status: "failed", error: validation.error });
      return;
    }
    setListening(true);
    setEvents([]);
    return subscribeContractEvents(
      validation.sanitized!,
      (event) => {
        setLiveLedger(event.ledger);
        setEvents((prev) => [
          `[#${event.ledger}] ${event.type}: ${JSON.stringify(event.data)}`,
          ...prev.slice(0, 49),
        ]);
      },
      () => setListening(false)
    );
  }, [viewContractId, listening]);

  const stopListening = useCallback(() => setListening(false), []);

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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto]"
        >
          <div>
            <h1 className="mb-3 text-[2.5rem] leading-[0.9] font-bold tracking-[-0.04em] uppercase">
              Contract
            </h1>
            <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase">
              Soroban Escrow · Oracle · SSE Events
            </div>
          </div>
          <div className="flex items-end">
            <Link
              href="/wallet"
              className="group flex items-center gap-2 border-b border-neutral-800 pb-1 text-xs tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Wallet
              <span className="text-neutral-600 transition-colors group-hover:text-red-400">
                →
              </span>
            </Link>
          </div>
        </motion.div>

        {/* What this page does — clear explanation */}
        <div className="mb-8 border border-neutral-800 p-6 text-xs leading-relaxed tracking-wide">
          <p className="mb-3 text-neutral-400">
            <span className="font-bold tracking-[0.2em] text-white uppercase">
              AnchorFX Escrow
            </span>{" "}
            is a Soroban smart contract that locks tokens between two Stellar
            accounts for atomic cross-border settlement. It integrates an{" "}
            <span className="text-amber-400">FX Rate Oracle</span> to determine
            exchange rates at settlement time.
          </p>
          <div className="grid grid-cols-2 gap-3 text-[10px] tracking-[0.2em] uppercase md:grid-cols-4">
            <div className="border border-neutral-800 p-3">
              <span className="mb-1 block font-bold text-amber-400">
                Create
              </span>
              <span className="text-neutral-500">
                Sender locks tokens with oracle FX rate
              </span>
            </div>
            <div className="border border-neutral-800 p-3">
              <span className="mb-1 block font-bold text-green-400">
                Settle
              </span>
              <span className="text-neutral-500">
                Admin releases to receiver at locked rate
              </span>
            </div>
            <div className="border border-neutral-800 p-3">
              <span className="mb-1 block font-bold text-blue-400">Refund</span>
              <span className="text-neutral-500">
                Sender reclaims after timeout expires
              </span>
            </div>
            <div className="border border-neutral-800 p-3">
              <span className="mb-1 block font-bold text-neutral-400">
                Events
              </span>
              <span className="text-neutral-500">
                Real-time SSE stream of all state changes
              </span>
            </div>
          </div>
        </div>

        <hr className="mb-12 border-neutral-800" />

        {!wallet.connected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-neutral-800 p-16 text-center"
          >
            <div className="mb-8 text-8xl font-black text-neutral-900 select-none">
              {}
            </div>
            <h2 className="mb-6 text-lg font-bold tracking-[0.3em] uppercase">
              Connect Wallet
            </h2>
            <p className="mb-8 text-xs tracking-wide text-neutral-500">
              Connect to deploy and interact with contracts.
            </p>
            <Link
              href="/wallet"
              className="inline-block bg-white px-8 py-4 text-xs font-bold tracking-[0.3em] text-black uppercase transition-colors hover:bg-neutral-200"
            >
              Go to Wallet
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* ── DEPLOY ── */}
            <div className="border border-neutral-800 p-8">
              <h3 className="mb-2 text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
                Deploy
              </h3>
              <p className="mb-6 text-[11px] leading-relaxed tracking-wide text-neutral-600">
                Deploy the AnchorFX escrow contract with FX oracle integration
                to Stellar testnet.
              </p>
              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="bg-white px-8 py-4 text-xs font-bold tracking-[0.3em] text-black uppercase transition-colors hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600"
              >
                {deploying ? "DEPLOYING..." : "Deploy"}
              </button>

              {status && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-6 border-l-4 p-5 ${
                    status.status === "success"
                      ? "border-green-400 bg-green-400/5"
                      : status.status === "failed"
                        ? "border-red-400 bg-red-400/5"
                        : "border-amber-400 bg-amber-400/5"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`text-xs font-bold tracking-[0.2em] uppercase ${
                        status.status === "success"
                          ? "text-green-400"
                          : status.status === "failed"
                            ? "text-red-400"
                            : "text-amber-400"
                      }`}
                    >
                      {status.status === "success"
                        ? "Success"
                        : status.status === "failed"
                          ? "Failed"
                          : status.status}
                    </span>
                  </div>
                  {status.hash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${status.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-neutral-500 transition-colors hover:text-white"
                    >
                      TX: {short(status.hash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {status.contractId && (
                    <div className="mt-1 text-xs break-all text-neutral-500">
                      Contract: {status.contractId}
                    </div>
                  )}
                  {status.error && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-neutral-400">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                      {status.error}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* ── READ ── */}
            <div className="border border-neutral-800 p-8">
              <h3 className="mb-2 text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
                Read State
              </h3>
              <p className="mb-5 text-[11px] leading-relaxed tracking-wide text-neutral-600">
                Query on-chain escrow data — sender, receiver, amount, status.
              </p>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="text"
                  value={viewContractId}
                  onChange={(e) => setViewContractId(e.target.value)}
                  placeholder="C..."
                  className="flex-1 border-b border-neutral-800 bg-transparent py-3 text-xs tracking-wide text-white transition-colors outline-none placeholder:text-neutral-700 focus:border-white"
                />
                <button
                  onClick={handleReadContract}
                  disabled={reading || !viewContractId}
                  className="shrink-0 bg-neutral-800 px-6 py-3 text-xs font-bold tracking-[0.3em] text-white uppercase transition-colors hover:bg-neutral-700 disabled:opacity-30"
                >
                  {reading ? "..." : "Read"}
                </button>
              </div>

              {escrowData && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-5 border border-neutral-800 p-5"
                >
                  <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
                    <div>
                      <div className="mb-1 text-[10px] tracking-[0.3em] text-neutral-600 uppercase">
                        Sender
                      </div>
                      <div className="truncate text-neutral-300">
                        {short(escrowData.sender)}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] tracking-[0.3em] text-neutral-600 uppercase">
                        Receiver
                      </div>
                      <div className="truncate text-neutral-300">
                        {short(escrowData.receiver)}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] tracking-[0.3em] text-neutral-600 uppercase">
                        Amount
                      </div>
                      <div className="font-bold text-neutral-300">
                        {escrowData.amount}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] tracking-[0.3em] text-neutral-600 uppercase">
                        Status
                      </div>
                      <div
                        className={`font-bold tracking-wider uppercase ${
                          escrowData.status === "Created"
                            ? "text-amber-400"
                            : escrowData.status === "Settled"
                              ? "text-green-400"
                              : escrowData.status === "Refunded"
                                ? "text-blue-400"
                                : escrowData.status === "Cancelled"
                                  ? "text-neutral-500"
                                  : "text-neutral-400"
                        }`}
                      >
                        {escrowData.status}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* ── EVENTS ── */}
            <div className="border border-neutral-800 p-8">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
                  Events
                </h3>
                {listening && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1 font-bold tracking-[0.2em] text-green-400 uppercase">
                      <span className="inline-block h-2 w-2 animate-pulse bg-green-400" />
                      Live
                    </span>
                    {liveLedger && (
                      <span className="text-neutral-600">#{liveLedger}</span>
                    )}
                    <Clock className="h-3 w-3 text-neutral-600" />
                    <span className="text-neutral-600">2s</span>
                  </div>
                )}
              </div>
              <p className="mb-5 text-[11px] leading-relaxed tracking-wide text-neutral-600">
                Real-time SSE stream of{" "}
                <code className="text-amber-400">created</code>,{" "}
                <code className="text-green-400">settled</code>,{" "}
                <code className="text-blue-400">refunded</code>, and{" "}
                <code className="text-neutral-400">cancelled</code> events.
              </p>

              <div className="mb-5 flex gap-3">
                <button
                  onClick={handleListen}
                  disabled={listening || !viewContractId}
                  className="flex items-center gap-2 bg-neutral-800 px-6 py-3 text-xs font-bold tracking-[0.3em] text-white uppercase transition-colors hover:bg-neutral-700 disabled:opacity-30"
                >
                  {listening ? (
                    <>
                      <RadioTower className="h-3 w-3 text-green-400" />{" "}
                      Streaming
                    </>
                  ) : (
                    <>
                      <RadioTower className="h-3 w-3" /> Connect
                    </>
                  )}
                </button>
                {listening && (
                  <button
                    onClick={stopListening}
                    className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-red-400"
                  >
                    Stop
                  </button>
                )}
              </div>

              {/* Event log or empty states */}
              {events.length > 0 && (
                <div className="h-56 overflow-y-auto border border-neutral-800 p-4 text-[11px] leading-relaxed">
                  {events.map((e, i) => (
                    <div
                      key={i}
                      className="py-px text-neutral-500 hover:text-neutral-300"
                    >
                      {e}
                    </div>
                  ))}
                </div>
              )}
              {listening && events.length === 0 && (
                <div className="border border-dashed border-neutral-800 p-10 text-center">
                  <p className="text-xs text-neutral-500">
                    Listening for contract events...
                  </p>
                </div>
              )}
              {!listening && events.length === 0 && (
                <div className="border border-dashed border-neutral-800 p-10 text-center">
                  <RadioTower className="mx-auto mb-3 h-5 w-5 text-neutral-800" />
                  <p className="text-xs text-neutral-600">
                    Connect to stream live contract events
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* User Feedback */}
        <div className="mt-12 border border-neutral-800 p-8">
          <h3 className="mb-2 text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
            Feedback
          </h3>
          <p className="mb-4 text-[11px] leading-relaxed tracking-wide text-neutral-600">
            Help improve AnchorFX. Share your experience, report issues, or
            suggest features.
          </p>
          <a
            href="mailto:komasubheeksh@gmail.com"
            className="inline-block bg-white px-6 py-3 text-xs font-bold tracking-[0.3em] text-black uppercase transition-colors hover:bg-neutral-200"
          >
            Submit Feedback
          </a>
        </div>

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
