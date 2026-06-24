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
import {
  ExternalLink,
  RadioTower,
  Clock,
  AlertTriangle,
} from "lucide-react";
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
    <main id="main" className="min-h-screen bg-black text-white font-mono">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 mb-16"
        >
          <div>
            <h1 className="text-[2.5rem] font-bold leading-[0.9] tracking-[-0.04em] uppercase mb-3">
              Contract
            </h1>
            <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              Soroban Escrow · Oracle · SSE Events
            </div>
          </div>
          <div className="flex items-end">
            <Link
              href="/wallet"
              className="group text-xs uppercase tracking-[0.2em] text-neutral-400 hover:text-red-400 transition-colors flex items-center gap-2 pb-1 border-b border-neutral-800 hover:border-red-400"
            >
              Wallet
              <span className="text-neutral-600 group-hover:text-red-400 transition-colors">→</span>
            </Link>
          </div>
        </motion.div>

        {/* What this page does — clear explanation */}
        <div className="border border-neutral-800 p-6 mb-8 text-xs leading-relaxed tracking-wide">
          <p className="text-neutral-400 mb-3">
            <span className="text-white font-bold uppercase tracking-[0.2em]">AnchorFX Escrow</span>{" "}
            is a Soroban smart contract that locks tokens between two Stellar accounts
            for atomic cross-border settlement. It integrates an{" "}
            <span className="text-amber-400">FX Rate Oracle</span> to determine exchange rates
            at settlement time.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] uppercase tracking-[0.2em]">
            <div className="border border-neutral-800 p-3">
              <span className="text-amber-400 font-bold block mb-1">Create</span>
              <span className="text-neutral-500">Sender locks tokens with oracle FX rate</span>
            </div>
            <div className="border border-neutral-800 p-3">
              <span className="text-green-400 font-bold block mb-1">Settle</span>
              <span className="text-neutral-500">Admin releases to receiver at locked rate</span>
            </div>
            <div className="border border-neutral-800 p-3">
              <span className="text-blue-400 font-bold block mb-1">Refund</span>
              <span className="text-neutral-500">Sender reclaims after timeout expires</span>
            </div>
            <div className="border border-neutral-800 p-3">
              <span className="text-neutral-400 font-bold block mb-1">Events</span>
              <span className="text-neutral-500">Real-time SSE stream of all state changes</span>
            </div>
          </div>
        </div>

        <hr className="border-neutral-800 mb-12" />

        {!wallet.connected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-neutral-800 p-16 text-center"
          >
            <div className="text-8xl font-black text-neutral-900 mb-8 select-none">{ }</div>
            <h2 className="text-lg uppercase tracking-[0.3em] font-bold mb-6">Connect Wallet</h2>
            <p className="text-neutral-500 text-xs mb-8 tracking-wide">Connect to deploy and interact with contracts.</p>
            <Link
              href="/wallet"
              className="inline-block bg-white hover:bg-neutral-200 text-black font-bold uppercase tracking-[0.3em] text-xs px-8 py-4 transition-colors"
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
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400 mb-2">Deploy</h3>
              <p className="text-[11px] text-neutral-600 mb-6 tracking-wide leading-relaxed">
                Deploy the AnchorFX escrow contract with FX oracle integration to Stellar testnet.
              </p>
              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600 text-black font-bold uppercase tracking-[0.3em] text-xs py-4 px-8 transition-colors"
              >
                {deploying ? "DEPLOYING..." : "Deploy"}
              </button>

              {status && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`mt-6 p-5 border-l-4 ${
                    status.status === "success"
                      ? "border-green-400 bg-green-400/5"
                      : status.status === "failed"
                        ? "border-red-400 bg-red-400/5"
                        : "border-amber-400 bg-amber-400/5"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs uppercase tracking-[0.2em] font-bold ${
                      status.status === "success" ? "text-green-400" :
                      status.status === "failed" ? "text-red-400" : "text-amber-400"
                    }`}>
                      {status.status === "success" ? "Success" :
                       status.status === "failed" ? "Failed" : status.status}
                    </span>
                  </div>
                  {status.hash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${status.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-xs"
                    >
                      TX: {short(status.hash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {status.contractId && (
                    <div className="mt-1 text-xs text-neutral-500 break-all">
                      Contract: {status.contractId}
                    </div>
                  )}
                  {status.error && (
                    <div className="mt-2 text-xs text-neutral-400 flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-red-400" />
                      {status.error}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* ── READ ── */}
            <div className="border border-neutral-800 p-8">
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400 mb-2">Read State</h3>
              <p className="text-[11px] text-neutral-600 mb-5 tracking-wide leading-relaxed">
                Query on-chain escrow data — sender, receiver, amount, status.
              </p>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={viewContractId}
                  onChange={(e) => setViewContractId(e.target.value)}
                  placeholder="C..."
                  className="flex-1 bg-transparent border-b border-neutral-800 focus:border-white outline-none py-3 text-xs text-white placeholder:text-neutral-700 tracking-wide transition-colors"
                />
                <button
                  onClick={handleReadContract}
                  disabled={reading || !viewContractId}
                  className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-white font-bold uppercase tracking-[0.3em] text-xs py-3 px-6 transition-colors shrink-0"
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-600 mb-1">Sender</div>
                      <div className="text-neutral-300 truncate">{short(escrowData.sender)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-600 mb-1">Receiver</div>
                      <div className="text-neutral-300 truncate">{short(escrowData.receiver)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-600 mb-1">Amount</div>
                      <div className="text-neutral-300 font-bold">{escrowData.amount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-600 mb-1">Status</div>
                      <div className={`font-bold uppercase tracking-wider ${
                        escrowData.status === "Created" ? "text-amber-400" :
                        escrowData.status === "Settled" ? "text-green-400" :
                        escrowData.status === "Refunded" ? "text-blue-400" :
                        escrowData.status === "Cancelled" ? "text-neutral-500" : "text-neutral-400"
                      }`}>{escrowData.status}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* ── EVENTS ── */}
            <div className="border border-neutral-800 p-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400">Events</h3>
                {listening && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-green-400 uppercase tracking-[0.2em] font-bold">
                      <span className="inline-block w-2 h-2 bg-green-400 animate-pulse" />
                      Live
                    </span>
                    {liveLedger && <span className="text-neutral-600">#{liveLedger}</span>}
                    <Clock className="h-3 w-3 text-neutral-600" />
                    <span className="text-neutral-600">2s</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-neutral-600 mb-5 tracking-wide leading-relaxed">
                Real-time SSE stream of <code className="text-amber-400">created</code>,{" "}
                <code className="text-green-400">settled</code>,{" "}
                <code className="text-blue-400">refunded</code>, and{" "}
                <code className="text-neutral-400">cancelled</code> events.
              </p>

              <div className="flex gap-3 mb-5">
                <button
                  onClick={handleListen}
                  disabled={listening || !viewContractId}
                  className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-white font-bold uppercase tracking-[0.3em] text-xs py-3 px-6 transition-colors flex items-center gap-2"
                >
                  {listening ? (
                    <><RadioTower className="h-3 w-3 text-green-400" /> Streaming</>
                  ) : (
                    <><RadioTower className="h-3 w-3" /> Connect</>
                  )}
                </button>
                {listening && (
                  <button
                    onClick={stopListening}
                    className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    Stop
                  </button>
                )}
              </div>

              {/* Event log or empty states */}
              {events.length > 0 && (
                <div className="border border-neutral-800 h-56 overflow-y-auto p-4 text-[11px] leading-relaxed">
                  {events.map((e, i) => (
                    <div key={i} className="text-neutral-500 hover:text-neutral-300 py-px">
                      {e}
                    </div>
                  ))}
                </div>
              )}
              {listening && events.length === 0 && (
                <div className="border border-dashed border-neutral-800 p-10 text-center">
                  <p className="text-xs text-neutral-500">Listening for contract events...</p>
                </div>
              )}
              {!listening && events.length === 0 && (
                <div className="border border-dashed border-neutral-800 p-10 text-center">
                  <RadioTower className="h-5 w-5 text-neutral-800 mx-auto mb-3" />
                  <p className="text-xs text-neutral-600">Connect to stream live contract events</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* User Feedback */}
        <div className="mt-12 border border-neutral-800 p-8">
          <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400 mb-2">Feedback</h3>
          <p className="text-[11px] text-neutral-600 mb-4 tracking-wide leading-relaxed">
            Help improve AnchorFX. Share your experience, report issues, or suggest features.
          </p>
          <a
            href="mailto:komasubheeksh@gmail.com"
            className="inline-block bg-white hover:bg-neutral-200 text-black font-bold uppercase tracking-[0.3em] text-xs py-3 px-6 transition-colors"
          >
            Submit Feedback
          </a>
        </div>

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
