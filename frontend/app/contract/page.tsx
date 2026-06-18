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
  Rocket,
  Loader2,
  ExternalLink,
  Database,
  RadioTower,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { validateContractId } from "@/lib/validation";

const easeOut = [0.16, 1, 0.3, 1] as const;

function short(str: string, n = 12): string {
  return str.length > n * 2 ? `${str.slice(0, n)}...${str.slice(-4)}` : str;
}

export default function ContractPage(): ReactNode {
  const { wallet } = useWallet();
  const [viewContractId, setViewContractId] = useState("");
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

    if (result.contractId) {
      setViewContractId(result.contractId);
    }
    setStatus(result);
    setDeploying(false);

    if (result.hash) {
      trackTransaction(result.hash, (s) => setStatus(s));
    }
  }, [wallet.publicKey, wallet.walletType]);

  const handleReadContract = useCallback(async () => {
    if (!viewContractId) return;
    const validation = validateContractId(viewContractId);
    if (!validation.valid) {
      setStatus({ status: "failed", error: validation.error });
      return;
    }
    setReading(true);
    const data = await getEscrowFromContract(validation.sanitized!);
    setEscrowData(data);
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

    const cleanup = subscribeContractEvents(
      validation.sanitized!,
      (event) => {
        setLiveLedger(event.ledger);
        setEvents((prev) => [
          `[ledger ${event.ledger}] ${event.type}: ${JSON.stringify(event.data)}`,
          ...prev.slice(0, 49),
        ]);
      },
      () => setListening(false)
    );

    return cleanup;
  }, [viewContractId, listening]);

  const stopListening = useCallback(() => {
    setListening(false);
  }, []);

  const statusLabel =
    status?.status === "success"
      ? "Deployment Successful"
      : status?.status === "failed"
        ? "Deployment Failed"
        : status?.status
          ? `Status: ${status.status}`
          : null;

  const statusIcon =
    status?.status === "success" ? (
      <CheckCircle2 className="h-5 w-5 text-green-400" />
    ) : status?.status === "failed" ? (
      <XCircle className="h-5 w-5 text-red-400" />
    ) : status?.status ? (
      <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
    ) : null;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
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
              <FileCode className="h-6 w-6 text-amber-400" />
              <h1 className="text-2xl font-medium tracking-tight">AnchorFX Contract</h1>
            </div>
            <p className="text-sm text-neutral-500 font-mono">SOROBAN ESCROW · TESTNET · SSE EVENTS</p>
          </div>
          <Link
            href="/wallet"
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-amber-400 transition-colors px-3 py-1.5 rounded-md border border-neutral-800 hover:border-amber-400/30"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Wallet
          </Link>
        </motion.div>

        {!wallet.connected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="border border-neutral-800 rounded-2xl p-10 text-center bg-neutral-900/50 backdrop-blur"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neutral-800 mb-6">
              <Rocket className="h-7 w-7 text-neutral-400" />
            </div>
            <h2 className="text-xl font-medium mb-2">Connect your wallet first</h2>
            <p className="text-neutral-500 text-sm mb-6">
              Go to the wallet page to connect, then return here to deploy contracts.
            </p>
            <Link
              href="/wallet"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-medium px-6 py-3 text-sm transition-colors"
            >
              Connect Wallet
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="space-y-4"
          >
            {/* Deploy Section */}
            <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 backdrop-blur p-6">
              <div className="flex items-center gap-2 mb-4">
                <Rocket className="h-4 w-4 text-neutral-500" />
                <h3 className="text-sm font-medium tracking-wide uppercase text-neutral-300">Deploy Escrow Contract</h3>
              </div>
              <p className="text-sm text-neutral-500 mb-5">
                Deploy the AnchorFX escrow contract to Stellar testnet. The connected wallet pays gas.
              </p>

              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-black font-medium px-6 py-3 text-sm transition-colors"
              >
                {deploying ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Deploying...</>
                ) : (
                  <><Rocket className="h-4 w-4" /> Deploy Contract</>
                )}
              </button>

              {/* Status */}
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 rounded-lg px-4 py-3 text-sm border ${
                    status.status === "success"
                      ? "border-green-400/20 bg-green-400/5"
                      : status.status === "failed"
                        ? "border-red-400/20 bg-red-400/5"
                        : "border-amber-400/20 bg-amber-400/5"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon}
                    <span className={`font-medium ${
                      status.status === "success" ? "text-green-400" :
                      status.status === "failed" ? "text-red-400" : "text-amber-400"
                    }`}>{statusLabel}</span>
                  </div>
                  {status.hash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${status.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-neutral-200 transition-colors font-mono text-xs ml-7"
                    >
                      TX: {short(status.hash)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {status.contractId && (
                    <div className="mt-1 font-mono text-xs text-neutral-400 ml-7 break-all">
                      Contract: {status.contractId}
                    </div>
                  )}
                  {status.error && (
                    <div className="mt-1 text-xs text-neutral-400 ml-7 flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      {status.error}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Read Contract */}
            <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 backdrop-blur p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-4 w-4 text-neutral-500" />
                <h3 className="text-sm font-medium tracking-wide uppercase text-neutral-300">Read Contract State</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={viewContractId}
                  onChange={(e) => setViewContractId(e.target.value)}
                  placeholder="C..."
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm font-mono text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all"
                />
                <button
                  onClick={handleReadContract}
                  disabled={reading || !viewContractId}
                  className="rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 border border-neutral-700 text-neutral-200 font-medium px-5 py-2.5 text-sm transition-colors inline-flex items-center gap-2 shrink-0"
                >
                  {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Read
                </button>
              </div>

              {escrowData && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-lg border border-neutral-700 bg-neutral-800/50 p-4 font-mono text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    <div>
                      <span className="text-neutral-500">Sender</span>
                      <p className="text-neutral-300 truncate">{short(escrowData.sender, 14)}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Receiver</span>
                      <p className="text-neutral-300 truncate">{short(escrowData.receiver, 14)}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Amount</span>
                      <p className="text-neutral-300">{escrowData.amount}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Status</span>
                      <p className={`font-medium uppercase ${
                        escrowData.status === "Created" ? "text-amber-400" :
                        escrowData.status === "Settled" ? "text-green-400" :
                        escrowData.status === "Refunded" ? "text-blue-400" : "text-neutral-400"
                      }`}>{escrowData.status}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Timeout Ledger</span>
                      <p className="text-neutral-300">{escrowData.timeoutLedger}</p>
                    </div>
                    <div>
                      <span className="text-neutral-500">Created At</span>
                      <p className="text-neutral-300">{escrowData.createdAt}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-neutral-500">Token</span>
                      <p className="text-neutral-300 truncate">{escrowData.token || "—"}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Events Stream */}
            <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 backdrop-blur p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <RadioTower className="h-4 w-4 text-neutral-500" />
                  <h3 className="text-sm font-medium tracking-wide uppercase text-neutral-300">Real-Time Events</h3>
                  {listening && (
                    <span className="flex items-center gap-1.5 text-[11px] text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full font-medium">
                      <Zap className="h-3 w-3" />
                      LIVE
                      {liveLedger && <span className="text-neutral-500 font-normal">#{liveLedger}</span>}
                    </span>
                  )}
                </div>
                {listening && (
                  <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Clock className="h-3 w-3" />
                    2s poll
                  </span>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleListen}
                  disabled={listening || !viewContractId}
                  className="rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 border border-neutral-700 text-neutral-200 font-medium px-4 py-2 text-sm transition-colors inline-flex items-center gap-2"
                >
                  {listening ? (
                    <><RadioTower className="h-4 w-4 animate-pulse text-green-400" /> Streaming</>
                  ) : (
                    <><RadioTower className="h-4 w-4" /> Connect Stream</>
                  )}
                </button>
                {listening && (
                  <button
                    onClick={stopListening}
                    className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors px-3"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {events.length > 0 && (
                <div className="rounded-lg border border-neutral-800 bg-neutral-950 h-48 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
                  {events.map((e, i) => (
                    <div key={i} className="text-neutral-500 hover:text-neutral-300 transition-colors py-px">
                      {e}
                    </div>
                  ))}
                </div>
              )}
              {listening && events.length === 0 && (
                <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-center">
                  <p className="text-sm text-neutral-500">
                    Waiting for events... Deploy a contract and interact with it to see live data.
                  </p>
                </div>
              )}
              {!listening && events.length === 0 && (
                <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-center">
                  <p className="text-sm text-neutral-600">
                    Enter a contract ID and connect the stream to see live events.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

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
