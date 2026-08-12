"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Activity, Database, Radio, ShieldCheck } from "lucide-react";
import { CONTRACT_ID, ORACLE_ID } from "@/lib/env";

interface Health {
  healthy: boolean;
  rpc: string;
  contract: string;
  lastLedger: number;
  escrowCount: number;
}

interface Analytics {
  totalEscrows: number;
  settledCount: number;
  refundedCount: number;
  cancelledCount: number;
  activeCount: number;
  totalVolume: string;
  events24h: number;
  lastLedger: number;
}

function short(str: string, n = 8): string {
  return str.length > n * 2 ? `${str.slice(0, n)}...${str.slice(-4)}` : str;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }): ReactNode {
  return (
    <span
      className={`inline-flex items-center gap-2 border px-3 py-1 text-[10px] font-bold tracking-[0.2em] uppercase ${
        ok
          ? "border-green-400/40 text-green-400"
          : "border-red-400/40 text-red-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`}
      />
      {label}
    </span>
  );
}

export default function StatusPage(): ReactNode {
  const [health, setHealth] = useState<Health | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = async () => {
    try {
      const [healthRes, analyticsRes] = await Promise.all([
        fetch(`/api/health?contract=${CONTRACT_ID}`).then((r) => r.json()),
        fetch(`/api/analytics?contract=${CONTRACT_ID}`).then((r) => r.json()),
      ]);
      setHealth(healthRes);
      setAnalytics(analyticsRes);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const rpcOk = health?.rpc === "connected";
  const contractOk = health?.contract === "active";

  return (
    <main id="main" className="min-h-screen bg-black font-mono text-white">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-[1fr_auto]"
        >
          <div>
            <h1 className="mb-3 text-[2.5rem] leading-[0.9] font-bold tracking-[-0.04em] uppercase">
              Network Status
            </h1>
            <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase">
              RPC · Contracts · Ledger
            </div>
          </div>
          <div className="flex items-end gap-4">
            <Link
              href="/explorer"
              className="border-b border-neutral-800 pb-1 text-[10px] tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Explorer
            </Link>
            <Link
              href="/admin"
              className="border-b border-neutral-800 pb-1 text-[10px] tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Admin
            </Link>
          </div>
        </motion.div>

        <hr className="mb-8 border-neutral-800" />

        {loading && !health ? (
          <div className="p-12 text-center text-xs text-neutral-600 uppercase">
            Loading...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs text-red-400">{error}</div>
        ) : (
          <>
            {/* Status summary */}
            <div className="mb-6 flex flex-wrap items-center gap-3 border border-neutral-800 p-5">
              <Activity
                className={`h-4 w-4 ${rpcOk && contractOk ? "text-green-400" : "text-red-400"}`}
              />
              <span className="text-[10px] tracking-[0.3em] text-neutral-400 uppercase">
                Status
              </span>
              <StatusPill
                ok={rpcOk}
                label={`RPC ${rpcOk ? "Connected" : "Error"}`}
              />
              <StatusPill
                ok={contractOk}
                label={`Contract ${contractOk ? "Active" : "Not Found"}`}
              />
              {lastUpdated && (
                <span className="ml-auto text-[10px] text-neutral-600">
                  checked {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Components */}
            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="border border-neutral-800 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <Radio className="h-4 w-4 text-neutral-500" />
                  <span className="text-[10px] tracking-[0.3em] text-neutral-400 uppercase">
                    RPC Endpoint
                  </span>
                </div>
                <div className="mb-2 text-2xl font-black">
                  {rpcOk ? "Operational" : "Error"}
                </div>
                <div className="text-[10px] text-neutral-600">
                  Last ledger:{" "}
                  {health?.lastLedger
                    ? health.lastLedger.toLocaleString()
                    : "—"}
                </div>
              </div>

              <div className="border border-neutral-800 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <Database className="h-4 w-4 text-neutral-500" />
                  <span className="text-[10px] tracking-[0.3em] text-neutral-400 uppercase">
                    Escrow Contract
                  </span>
                </div>
                <div className="mb-2 font-mono text-xs text-neutral-400">
                  {short(CONTRACT_ID)}
                </div>
                <div className="text-[10px] text-neutral-600">
                  {health?.escrowCount ?? 0} escrows on-chain
                </div>
              </div>

              <div className="border border-neutral-800 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-neutral-500" />
                  <span className="text-[10px] tracking-[0.3em] text-neutral-400 uppercase">
                    Oracle Contract
                  </span>
                </div>
                <div className="mb-2 font-mono text-xs text-neutral-400">
                  {short(ORACLE_ID)}
                </div>
                <div className="text-[10px] text-neutral-600">FX rate feed</div>
              </div>
            </div>

            {/* Analytics */}
            {analytics && (
              <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="border border-neutral-800 p-5">
                  <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                    Escrows
                  </div>
                  <div className="text-4xl font-black">
                    {analytics.totalEscrows}
                  </div>
                </div>
                <div className="border border-neutral-800 p-5">
                  <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                    Settled
                  </div>
                  <div className="text-4xl font-black text-green-400">
                    {analytics.settledCount}
                  </div>
                </div>
                <div className="border border-neutral-800 p-5">
                  <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                    Active
                  </div>
                  <div className="text-4xl font-black text-amber-400">
                    {analytics.activeCount}
                  </div>
                </div>
                <div className="border border-neutral-800 p-5">
                  <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                    Refunded
                  </div>
                  <div className="text-4xl font-black text-red-400">
                    {analytics.refundedCount}
                  </div>
                </div>
                <div className="border border-neutral-800 p-5">
                  <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                    Events (last query)
                  </div>
                  <div className="text-4xl font-black">
                    {analytics.events24h}
                  </div>
                </div>
              </div>
            )}
          </>
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
