"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Globe, Clock, Search, ArrowUpRight } from "lucide-react";
import { CONTRACT_ID, NETWORK } from "@/lib/env";
import {
  CORRIDOR_OPTIONS,
  corridorFor,
  corridorLabel,
} from "@/lib/corridors";

interface EscrowRecord {
  id: number;
  sender: string;
  receiver: string;
  token: string;
  amount: string;
  fxRate: number;
  corridor: number;
  timeoutLedger: number;
  status: string;
  createdAt: number;
  approvedAt: number;
  settledAt: number;
}

const STATUSES = [
  "Created",
  "CounterpartyApproved",
  "Settled",
  "Refunded",
  "Cancelled",
];

const EXPLORER_NETWORK =
  NETWORK === "PUBLIC" ? "public" : "testnet";

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

const statusBg = (status: string) => {
  switch (status) {
    case "Created":
      return "bg-amber-400";
    case "CounterpartyApproved":
      return "bg-blue-400";
    case "Settled":
      return "bg-green-400";
    case "Refunded":
      return "bg-red-400";
    case "Cancelled":
      return "bg-neutral-500";
    default:
      return "bg-neutral-400";
  }
};

function short(str: string, n = 6): string {
  return str.length > n * 2 ? `${str.slice(0, n)}...${str.slice(-4)}` : str;
}

export default function ExplorerPage(): ReactNode {
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [corridor, setCorridor] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchEscrows = async () => {
    try {
      const res = await fetch(`/api/escrows?contract=${CONTRACT_ID}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setEscrows(data.escrows ?? []);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load escrows"
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEscrows();
    const interval = setInterval(fetchEscrows, 15000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return escrows.filter((e) => {
      if (corridor > 0 && e.corridor !== corridor) return false;
      if (status && e.status !== status) return false;
      if (q) {
        const haystack = `${e.sender} ${e.receiver} ${e.token} #${e.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [escrows, corridor, status, query]);

  const stats = useMemo(() => {
    const settled = escrows.filter((e) => e.status === "Settled");
    const volume = settled.reduce(
      (sum, e) => sum + (parseInt(e.amount, 10) || 0),
      0
    );
    const active = escrows.filter(
      (e) => e.status === "Created" || e.status === "CounterpartyApproved"
    ).length;
    const uniqueUsers = new Set(
      escrows.flatMap((e) => [e.sender, e.receiver])
    ).size;
    return {
      total: escrows.length,
      settled: settled.length,
      active,
      volume,
      uniqueUsers,
    };
  }, [escrows]);

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
              Escrow Explorer
            </h1>
            <div className="text-xs tracking-[0.3em] text-neutral-500 uppercase">
              Public On-Chain Activity ·{" "}
              {NETWORK === "PUBLIC" ? "Mainnet" : "Testnet"}
            </div>
          </div>
          <div className="flex items-end gap-4">
            <Link
              href="/anchors"
              className="border-b border-neutral-800 pb-1 text-[10px] tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Settlement Desk
            </Link>
            <Link
              href="/rates"
              className="border-b border-neutral-800 pb-1 text-[10px] tracking-[0.2em] text-neutral-400 uppercase transition-colors hover:border-red-400 hover:text-red-400"
            >
              Live Rates
            </Link>
          </div>
        </motion.div>

        <hr className="mb-8 border-neutral-800" />

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="border border-neutral-800 p-5">
            <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
              Escrows
            </div>
            <div className="text-4xl font-black">{stats.total}</div>
          </div>
          <div className="border border-neutral-800 p-5">
            <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
              Settled
            </div>
            <div className="text-4xl font-black text-green-400">
              {stats.settled}
            </div>
          </div>
          <div className="border border-neutral-800 p-5">
            <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
              Active
            </div>
            <div className="text-4xl font-black text-amber-400">
              {stats.active}
            </div>
          </div>
          <div className="border border-neutral-800 p-5">
            <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
              Users
            </div>
            <div className="text-4xl font-black">{stats.uniqueUsers}</div>
          </div>
          <div className="border border-neutral-800 p-5">
            <div className="mb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">
              Volume (units)
            </div>
            <div className="text-2xl font-black">
              {stats.volume.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 border border-neutral-800 p-5">
          <div className="mb-4 flex items-center gap-3">
            <Globe className="h-4 w-4 text-neutral-500" />
            <span className="text-[10px] tracking-[0.3em] text-neutral-400 uppercase">
              Filter
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCorridor(0)}
              className={`border px-4 py-2 text-[10px] font-bold tracking-[0.15em] uppercase transition-colors ${
                corridor === 0
                  ? "border-white bg-white text-black"
                  : "border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              All Corridors
            </button>
            {CORRIDOR_OPTIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCorridor(c.id)}
                className={`border px-4 py-2 text-[10px] font-bold tracking-[0.15em] uppercase transition-colors ${
                  corridor === c.id
                    ? "border-white bg-white text-black"
                    : "border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {corridorLabel(c.id)}
              </button>
            ))}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-neutral-800 bg-black px-3 py-2 text-[10px] font-bold tracking-[0.15em] text-white uppercase"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search address or #id"
                className="w-64 border border-neutral-800 bg-black py-2 pr-3 pl-9 text-xs text-white placeholder:text-neutral-600"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mb-8 border border-neutral-800">
          <div className="flex items-center gap-2 border-b border-neutral-800 p-5">
            <Clock className="h-4 w-4 text-neutral-500" />
            <h3 className="text-xs font-bold tracking-[0.3em] text-neutral-400 uppercase">
              Escrows ({filtered.length})
            </h3>
            {lastUpdated && (
              <span className="ml-auto text-[10px] text-neutral-600">
                updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          {loading && escrows.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-600 uppercase">
              Loading...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-xs text-red-400">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-600">
              No escrows match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
                    <th className="p-4 text-left font-bold">ID</th>
                    <th className="p-4 text-left font-bold">Corridor</th>
                    <th className="p-4 text-left font-bold">Parties</th>
                    <th className="p-4 text-right font-bold">Deposit</th>
                    <th className="p-4 text-right font-bold">FX Rate</th>
                    <th className="p-4 text-center font-bold">Status</th>
                    <th className="p-4 text-center font-bold">Explorer</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const c = corridorFor(e.corridor);
                    return (
                      <tr
                        key={e.id}
                        className="border-b border-neutral-900 hover:bg-neutral-900/30"
                      >
                        <td className="p-4 text-neutral-400">#{e.id}</td>
                        <td className="p-4 text-neutral-300">
                          {c.from} → {c.to}
                        </td>
                        <td className="p-4 font-mono text-[10px] text-neutral-500">
                          <div>S: {short(e.sender)}</div>
                          <div>R: {short(e.receiver)}</div>
                        </td>
                        <td className="p-4 text-right font-bold">
                          {parseInt(e.amount, 10).toLocaleString()}
                        </td>
                        <td className="p-4 text-right text-neutral-500">
                          {e.fxRate
                            ? (e.fxRate / 100000).toFixed(4) + "x"
                            : "—"}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.15em] uppercase ${statusColor(e.status)}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statusBg(e.status)}`}
                            />
                            {e.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <a
                            href={`https://stellar.expert/explorer/${EXPLORER_NETWORK}/contract/${CONTRACT_ID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] tracking-[0.1em] text-neutral-500 uppercase transition-colors hover:text-white"
                          >
                            View <ArrowUpRight className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
