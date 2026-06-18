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
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { validateContractId } from "@/lib/validation";

const easeOut = [0.16, 1, 0.3, 1] as const;

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

    // Track tx if hash exists
    if (result.hash) {
      trackTransaction(result.hash, (s) => setStatus(s));
    }
  }, [wallet.publicKey, wallet.walletType]);

  const handleReadContract = useCallback(async () => {
    if (!viewContractId) return;
    // OWASP: Validate contract ID
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
    // OWASP: Validate contract ID
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
      () => {
        setListening(false);
      }
    );

    return cleanup;
  }, [viewContractId, listening]);

  const stopListening = useCallback(() => {
    // cleanup handled by the return of handleListen, just reset state
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

  return (
    <main className="flex min-h-screen flex-col items-center px-6 pt-32 pb-24">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
              AnchorFX Contract
            </h1>
            <p className="text-muted-foreground mt-2">
              Deploy and interact with the Soroban escrow contract on testnet
            </p>
          </div>

          {!wallet.connected ? (
            <div className="bg-muted rounded-2xl p-8 text-center">
              <Rocket className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h2 className="mb-2 text-xl font-medium">Connect your wallet first</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Go to the wallet page to connect, then return here to deploy contracts.
              </p>
              <Link
                href="/wallet"
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-2 rounded-md px-6 py-3 font-medium transition-colors"
              >
                Connect Wallet
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Deploy */}
              <div className="bg-muted rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-medium">Deploy Escrow Contract</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Deploys the AnchorFX escrow contract to Stellar testnet. The
                  connected wallet pays for deployment.
                </p>

                <button
                  onClick={handleDeploy}
                  disabled={deploying}
                  className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-2 rounded-md px-6 py-3 font-medium transition-colors disabled:opacity-50"
                >
                  {deploying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )}
                  {deploying ? "Deploying..." : "Deploy Contract"}
                </button>

                {statusLabel && (
                  <div
                    className={`mt-4 rounded-md p-4 text-sm ${
                      status?.status === "success"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : status?.status === "failed"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                    }`}
                  >
                    <div className="mb-1 font-medium">{statusLabel}</div>
                    {status?.hash && (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${status.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 underline"
                      >
                        {status.hash.slice(0, 12)}... <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {status?.contractId && (
                      <div className="mt-1 font-mono text-xs break-all">
                        Contract: {status.contractId}
                      </div>
                    )}
                    {status?.error && <p className="mt-1">{status.error}</p>}
                  </div>
                )}
              </div>

              {/* Read Contract */}
              <div className="bg-muted rounded-2xl p-6">
                <h3 className="mb-4 text-lg font-medium">Read Contract State</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={viewContractId}
                    onChange={(e) => setViewContractId(e.target.value)}
                    placeholder="Contract ID (C...)"
                    className="bg-background border-border flex-1 rounded-md border px-3 py-2.5 text-sm outline-none"
                  />
                  <button
                    onClick={handleReadContract}
                    disabled={reading || !viewContractId}
                    className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                    Read
                  </button>
                </div>

                {escrowData && (
                  <div className="bg-background mt-4 rounded-md p-4 font-mono text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground">Sender:</span>
                      <span className="truncate">{escrowData.sender}</span>
                      <span className="text-muted-foreground">Receiver:</span>
                      <span className="truncate">{escrowData.receiver}</span>
                      <span className="text-muted-foreground">Amount:</span>
                      <span>{escrowData.amount}</span>
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-accent uppercase">{escrowData.status}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Event listener */}
              <div className="bg-muted rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-medium">Real-Time Events</h3>
                  {listening && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Zap className="h-3 w-3" /> Live
                      {liveLedger && <span className="text-muted-foreground">· ledger {liveLedger}</span>}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleListen}
                    disabled={listening || !viewContractId}
                    className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {listening ? (
                      <>
                        <RadioTower className="h-4 w-4 animate-pulse text-green-500" />
                        Streaming
                      </>
                    ) : (
                      <>
                        <RadioTower className="h-4 w-4" />
                        Connect Stream
                      </>
                    )}
                  </button>
                  {listening && (
                    <button
                      onClick={stopListening}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors px-3"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                {events.length > 0 && (
                  <div className="bg-background mt-4 h-48 overflow-y-auto rounded-md p-3 font-mono text-xs">
                    {events.map((e, i) => (
                      <div key={i} className="text-muted-foreground py-0.5">{e}</div>
                    ))}
                  </div>
                )}
                {listening && events.length === 0 && (
                  <p className="text-muted-foreground mt-4 text-sm">
                    Waiting for events... Interact with the contract to see live events.
                  </p>
                )}
              </div>
            </div>
          )}

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
