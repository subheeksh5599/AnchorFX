"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  Database,
  Heart,
  ArrowUpRight,
  RadioTower,
  Clock,
  Users,
  ArrowRight,
  Ban,
  X,
} from "lucide-react";
import { useWallet } from "@/components/wallet-provider";
import {
  settleEscrow,
  cancelEscrow,
  type TxStatus,
} from "@/lib/contract-client";
import { ADMIN_PUBLIC_KEY, CONTRACT_ID } from "@/lib/env";

interface EscrowRecord {
  id: number;
  sender: string;
  receiver: string;
  amount: string;
  fxRate: number;
  corridor: number;
  status: string;
  createdAt: number;
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

interface Health {
  healthy: boolean;
  rpc: string;
  contract: string;
  lastLedger: number;
  escrowCount: number;
}

function short(str: string, n = 8): string {
  return str.length > n * 2 ? `${str.slice(0, n)}...${str.slice(-4)}` : str;
}

export default function AdminPage(): ReactNode {
  const { wallet } = useWallet();
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);

  const connected = wallet.connected;
  const publicKey = wallet.publicKey;
  const isAdmin = publicKey === ADMIN_PUBLIC_KEY;

  const fetchAll = useCallback(async () => {
    try {
      const [escrowsRes, analyticsRes, healthRes] = await Promise.all([
        fetch(`/api/escrows?contract=${CONTRACT_ID}`).then((r) => r.json()),
        fetch(`/api/analytics?contract=${CONTRACT_ID}`).then((r) => r.json()),
        fetch(`/api/health?contract=${CONTRACT_ID}`).then((r) => r.json()),
      ]);
      setEscrows(escrowsRes.escrows ?? []);
      setAnalytics(analyticsRes);
      setHealth(healthRes);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleSettle = async (escrowId: number) => {
    if (!wallet.walletType || !wallet.publicKey) return;
    setTxStatus({ status: "building" });
    const result = await settleEscrow(
      wallet.publicKey,
      wallet.walletType,
      CONTRACT_ID,
      escrowId,
      (s) => setTxStatus(s)
    );
    if (result.status === "success") {
      setTimeout(() => {
        setTxStatus(null);
        fetchAll();
      }, 2000);
    }
  };

  const handleCancel = async (escrowId: number) => {
    if (!wallet.walletType || !wallet.publicKey) return;
    setTxStatus({ status: "building" });
    const result = await cancelEscrow(
      wallet.publicKey,
      wallet.walletType,
      CONTRACT_ID,
      escrowId,
      (s) => setTxStatus(s)
    );
    if (result.status === "success") {
      setTimeout(() => {
        setTxStatus(null);
        fetchAll();
      }, 2000);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Created":
        return "text-amber-400";
      case "CounterpartyApproved":
        return "text-blue-400";
      case "Settled":
        return "text-green-400";
      case "Refunded":
        return "text-red-400";
      case "Cancelled":
        return "text-neutral-500";
      default:
        return "text-neutral-400";
    }
  };

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
              Admin
            </h1>
            <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase">
              AnchorFX Relay · Analytics · Monitoring
            </div>
          </div>
          <div className="flex items-end gap-4">
            <Link
              href="/wallet"
              className="border-b border-neutral-800 pb-1 text-[10px] tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Wallet
            </Link>
            <Link
              href="/contract"
              className="border-b border-neutral-800 pb-1 text-[10px] tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Contract
            </Link>
            <Link
              href="/anchors"
              className="border-b border-neutral-800 pb-1 text-[10px] tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Anchors
            </Link>
          </div>
        </motion.div>

        <hr className="mb-8 border-neutral-800" />

        {/* Wallet + Admin Status */}
        <div className="mb-6 flex flex-wrap items-center gap-6 border border-neutral-800 p-4 text-[11px]">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`}
            />
            <span className="font-bold tracking-[0.2em] text-neutral-400 uppercase">
              Wallet
            </span>
            <span className={connected ? "text-green-400" : "text-red-400"}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          {isAdmin && connected && (
            <span className="border border-purple-400/30 px-2 py-0.5 text-[10px] tracking-[0.2em] text-purple-400 uppercase">
              Admin Privileges
            </span>
          )}
          {!connected && (
            <Link
              href="/wallet"
              className="border-b border-amber-400/30 pb-0.5 text-[10px] tracking-[0.2em] text-amber-400 uppercase hover:text-amber-300"
            >
              Connect Wallet
            </Link>
          )}
        </div>

        {/* TX Status */}
        {txStatus && (
          <div
            className={`mb-6 flex items-center gap-3 border p-4 text-xs ${
              txStatus.status === "failed"
                ? "border-red-400/50 bg-red-400/5"
                : txStatus.status === "success"
                  ? "border-green-400/50 bg-green-400/5"
                  : "border-amber-400/50 bg-amber-400/5"
            }`}
          >
            <span
              className={`font-bold tracking-[0.2em] uppercase ${txStatus.status === "failed" ? "text-red-400" : txStatus.status === "success" ? "text-green-400" : "text-amber-400"}`}
            >
              {txStatus.status}
            </span>
            {txStatus.hash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txStatus.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-neutral-500 hover:text-white"
              >
                {short(txStatus.hash, 10)}
              </a>
            )}
            {txStatus.error && (
              <span className="text-red-400">{txStatus.error}</span>
            )}
            <button
              onClick={() => setTxStatus(null)}
              className="ml-auto text-neutral-600 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Status Bar */}
        {health && (
          <div className="mb-6 flex flex-wrap items-center gap-6 border border-neutral-800 p-4 text-[11px]">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${health.healthy ? "bg-green-400" : "bg-red-400"} animate-pulse`}
              />
              <span className="font-bold tracking-[0.2em] text-neutral-400 uppercase">
                System
              </span>
              <span
                className={health.healthy ? "text-green-400" : "text-red-400"}
              >
                {health.healthy ? "ONLINE" : "DEGRADED"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3 text-neutral-600" />
              <span className="font-bold tracking-[0.2em] text-neutral-400 uppercase">
                RPC
              </span>
              <span
                className={
                  health.rpc === "connected" ? "text-green-400" : "text-red-400"
                }
              >
                {health.rpc}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-3 w-3 text-neutral-600" />
              <span className="font-bold tracking-[0.2em] text-neutral-400 uppercase">
                Contract
              </span>
              <span
                className={
                  health.contract === "active"
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {health.contract}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Clock className="h-3 w-3 text-neutral-600" />
              <span className="text-neutral-500">Last Ledger</span>
              <span className="font-bold">{health.lastLedger}</span>
            </div>
            <button
              onClick={fetchAll}
              className="text-[10px] tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-white"
            >
              Refresh
            </button>
          </div>
        )}

        {/* Analytics Grid */}
        {analytics && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="border border-neutral-800 p-5">
              <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                Total Escrows
              </div>
              <div className="text-4xl font-black">
                {analytics.totalEscrows}
              </div>
              <div className="mt-2 text-[10px] text-neutral-500">
                <span className="text-green-400">
                  {analytics.settledCount} settled
                </span>
                {" · "}
                <span className="text-blue-400">
                  {analytics.refundedCount} refunded
                </span>
              </div>
            </div>
            <div className="border border-neutral-800 p-5">
              <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                Active
              </div>
              <div className="text-4xl font-black text-amber-400">
                {analytics.activeCount}
              </div>
              <div className="mt-2 text-[10px] text-neutral-500">
                <span className="text-neutral-500">
                  {analytics.cancelledCount} cancelled
                </span>
              </div>
            </div>
            <div className="border border-neutral-800 p-5">
              <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                Events (24h)
              </div>
              <div className="text-4xl font-black">{analytics.events24h}</div>
              <div className="mt-2 text-[10px] text-neutral-500">
                from ledger #{analytics.lastLedger}
              </div>
            </div>
            <div className="border border-neutral-800 p-5">
              <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
                Total Volume
              </div>
              <div className="text-2xl font-black">{analytics.totalVolume}</div>
              <div className="mt-2 text-[10px] text-neutral-500">stroops</div>
            </div>
          </div>
        )}

        {/* Escrow Table */}
        <div className="border border-neutral-800">
          <div className="flex items-center justify-between border-b border-neutral-800 p-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-500" />
              <h3 className="text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
                Escrows ({escrows.length})
              </h3>
            </div>
            <Link
              href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] tracking-[0.2em] text-neutral-500 uppercase transition-colors hover:text-white"
            >
              Explorer <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {loading && escrows.length === 0 ? (
            <div className="p-12 text-center text-xs tracking-[0.2em] text-neutral-600 uppercase">
              Loading...
            </div>
          ) : escrows.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-xs tracking-[0.2em] text-neutral-600 uppercase">
                No escrows found
              </p>
              <p className="mt-2 text-[10px] text-neutral-700">
                Deploy a contract and create escrows to see data here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
                    <th className="p-4 text-left font-bold">ID</th>
                    <th className="p-4 text-left font-bold">Sender</th>
                    <th className="p-4 text-left font-bold">Receiver</th>
                    <th className="p-4 text-right font-bold">Amount</th>
                    <th className="p-4 text-right font-bold">FX Rate</th>
                    <th className="p-4 text-center font-bold">Status</th>
                    <th className="p-4 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {escrows.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-neutral-900 transition-colors hover:bg-neutral-900/30"
                    >
                      <td className="p-4 text-neutral-400">#{e.id}</td>
                      <td className="p-4 font-mono text-[10px] text-neutral-500">
                        {short(e.sender)}
                      </td>
                      <td className="p-4 font-mono text-[10px] text-neutral-500">
                        {short(e.receiver)}
                      </td>
                      <td className="p-4 text-right font-bold">{e.amount}</td>
                      <td className="p-4 text-right text-neutral-500">
                        {e.fxRate ? (e.fxRate / 100000).toFixed(5) : "—"}
                      </td>
                      <td
                        className={`p-4 text-center font-bold tracking-[0.2em] uppercase ${statusColor(e.status)}`}
                      >
                        {e.status}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          {isAdmin &&
                            connected &&
                            (e.status === "Created" ||
                              e.status === "CounterpartyApproved") && (
                              <button
                                onClick={() => handleSettle(e.id)}
                                className="border border-green-400/30 px-2 py-1 text-[10px] tracking-[0.1em] text-green-400 uppercase transition-colors hover:border-green-400 hover:text-white"
                              >
                                <ArrowRight className="mr-1 inline h-3 w-3" />
                                Settle
                              </button>
                            )}
                          {isAdmin && connected && e.status === "Created" && (
                            <button
                              onClick={() => handleCancel(e.id)}
                              className="border border-neutral-700 px-2 py-1 text-[10px] tracking-[0.1em] text-neutral-500 uppercase transition-colors hover:border-neutral-500 hover:text-white"
                            >
                              <Ban className="mr-1 inline h-3 w-3" />
                              Cancel
                            </button>
                          )}
                          {(!isAdmin || !connected) && (
                            <span className="text-[10px] text-neutral-700">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Webhook / Subscribe info */}
        <div className="mt-8 border border-neutral-800 p-6">
          <div className="mb-3 flex items-center gap-2">
            <RadioTower className="h-4 w-4 text-neutral-500" />
            <h3 className="text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
              Webhooks
            </h3>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed tracking-wide text-neutral-600">
            Anchor operators can subscribe to escrow state changes via the SSE
            endpoint. Each event includes the escrow ID, type, and data payload.
          </p>
          <code className="block border border-neutral-800 bg-neutral-900 p-3 text-xs break-all text-neutral-400">
            GET /api/events?contract={CONTRACT_ID}
          </code>
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
