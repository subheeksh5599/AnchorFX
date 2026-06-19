"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Globe, Clock, DollarSign } from "lucide-react";

type AnchorRole = "anchor_a" | "anchor_b";

interface EscrowRecord {
  id: number;
  sender: string;
  receiver: string;
  amount: string;
  fxRate: number;
  corridor: number;
  timeoutLedger: number;
  status: string;
  createdAt: number;
  approvedAt: number;
  settledAt: number;
}

const CONTRACT_ID = "CBXJRCVLWK5GGBKVC5RAFCTCDCCRRXLBXDNVRVW7YUGPLFW3K3BVXC6Y";

const CORRIDORS: Record<number, { from: string; to: string }> = {
  1: { from: "US", to: "PH" },
  2: { from: "US", to: "MX" },
  3: { from: "EUR", to: "BR" },
  4: { from: "US", to: "NG" },
  5: { from: "EUR", to: "IN" },
};

const USER_ADDRESS = "GC3Z6XEDF25KKJGGKF6V4ALMWWLWOD3KHKYM3DO5WJJTVHXJMEY64BWF";

export default function AnchorsPage(): ReactNode {
  const [role, setRole] = useState<AnchorRole>("anchor_a");
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEscrows = useCallback(async () => {
    try {
      const res = await fetch(`/api/escrows?contract=${CONTRACT_ID}`);
      const data = await res.json();
      setEscrows(data.escrows ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEscrows();
    const interval = setInterval(fetchEscrows, 10000);
    return () => clearInterval(interval);
  }, [fetchEscrows]);

  const pendingForMe = escrows.filter(e => {
    if (role === "anchor_a") return e.sender === USER_ADDRESS && e.status === "Created";
    return e.receiver === USER_ADDRESS && e.status === "CounterpartyApproved";
  });

  const needApproval = escrows.filter(e => {
    if (role === "anchor_b") return e.receiver === USER_ADDRESS && e.status === "Created";
    return e.sender !== USER_ADDRESS && e.status === "Created";
  });

  const completed = escrows.filter(e => e.status === "Settled" || e.status === "Refunded" || e.status === "Cancelled");

  const corridorPairs = new Map<string, { count: number; volume: number }>();
  for (const e of escrows) {
    const c = CORRIDORS[e.corridor] ?? { from: "??", to: "??" };
    const key = `${c.from} → ${c.to}`;
    const prev = corridorPairs.get(key) ?? { count: 0, volume: 0 };
    corridorPairs.set(key, { count: prev.count + 1, volume: prev.volume + parseInt(e.amount, 10) || 0 });
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "Created": return "text-amber-400";
      case "CounterpartyApproved": return "text-blue-400";
      case "Settled": return "text-green-400";
      case "Refunded": return "text-red-400";
      case "Cancelled": return "text-neutral-500";
      default: return "text-neutral-400";
    }
  };

  const roleLabel = role === "anchor_a" ? "Anchor A · United States" : "Anchor B · Philippines";
  const roleFlag = role === "anchor_a" ? "🇺🇸" : "🇵🇭";

  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: "48px 48px" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-16">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 mb-12">
          <div>
            <h1 className="text-[2.5rem] font-bold leading-[0.9] tracking-[-0.04em] uppercase mb-3">AnchorFX</h1>
            <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">Cross-Border Settlement</div>
          </div>
          <div className="flex items-end gap-4">
            <Link href="/wallet" className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 hover:text-red-400 transition-colors border-b border-neutral-800 hover:border-red-400 pb-1">Wallet</Link>
            <Link href="/admin" className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 hover:text-red-400 transition-colors border-b border-neutral-800 hover:border-red-400 pb-1">Admin</Link>
          </div>
        </motion.div>

        <hr className="border-neutral-800 mb-12" />

        {/* Role Selector */}
        <div className="border border-neutral-800 p-5 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="h-4 w-4 text-neutral-500" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-400">Select Role</span>
          </div>
          <div className="flex gap-3">
            {(["anchor_a", "anchor_b"] as AnchorRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-6 py-3 text-xs uppercase tracking-[0.2em] font-bold transition-colors border ${
                  role === r ? "bg-white text-black border-white" : "border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {r === "anchor_a" ? "🇺🇸 Anchor A · US" : "🇵🇭 Anchor B · Philippines"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="border border-neutral-800 p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-2">Role</div>
            <div className="text-lg font-black">{roleFlag} {roleLabel}</div>
          </div>
          <div className="border border-neutral-800 p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-2">Pending</div>
            <div className="text-4xl font-black text-amber-400">{pendingForMe.length}</div>
          </div>
          <div className="border border-neutral-800 p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-2">Need Approval</div>
            <div className="text-4xl font-black text-blue-400">{needApproval.length}</div>
          </div>
          <div className="border border-neutral-800 p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-2">Settled</div>
            <div className="text-4xl font-black text-green-400">{completed.filter(e => e.status === "Settled").length}</div>
          </div>
        </div>

        {/* Settlement Lifecycle */}
        <div className="border border-neutral-800 mb-8">
          <div className="p-5 border-b border-neutral-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-500" />
            <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400">
              Settlement Lifecycle ({escrows.length})
            </h3>
          </div>
          {loading && escrows.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-600 uppercase">Loading...</div>
          ) : escrows.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-600">No settlements yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    <th className="text-left p-4 font-bold">ID</th>
                    <th className="text-left p-4 font-bold">Corridor</th>
                    <th className="text-right p-4 font-bold">Amount</th>
                    <th className="text-right p-4 font-bold">FX Rate</th>
                    <th className="text-center p-4 font-bold">Lifecycle</th>
                    <th className="text-right p-4 font-bold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {escrows.map((e) => {
                    const c = CORRIDORS[e.corridor] ?? { from: "??", to: "??" };
                    const lifecycle: string[] = ["Created"];
                    if (e.status !== "Created" || e.approvedAt > 0) lifecycle.push("Approved");
                    if (e.status === "Settled") lifecycle.push("Settled");
                    if (e.status === "Refunded") lifecycle.push("Refunded");
                    if (e.status === "Cancelled") lifecycle.push("Cancelled");
                    return (
                      <tr key={e.id} className="border-b border-neutral-900 hover:bg-neutral-900/30">
                        <td className="p-4 text-neutral-400">#{e.id}</td>
                        <td className="p-4 text-neutral-300">{c.from} → {c.to}</td>
                        <td className="p-4 text-right font-bold">{parseInt(e.amount, 10).toLocaleString()}</td>
                        <td className="p-4 text-right text-neutral-500">{(e.fxRate / 100000).toFixed(4)}</td>
                        <td className={`p-4 text-center font-bold uppercase tracking-[0.2em] ${statusColor(e.status)}`}>
                          {lifecycle.join(" › ")}
                        </td>
                        <td className="p-4 text-right text-neutral-600">#{e.createdAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Corridor Analytics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="border border-neutral-800">
            <div className="p-5 border-b border-neutral-800 flex items-center gap-2">
              <Globe className="h-4 w-4 text-neutral-500" />
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400">Corridor Analytics</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  <th className="text-left p-4 font-bold">Pair</th>
                  <th className="text-right p-4 font-bold">Settlements</th>
                  <th className="text-right p-4 font-bold">Volume</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(corridorPairs.entries()).map(([pair, stats]) => (
                  <tr key={pair} className="border-b border-neutral-900">
                    <td className="p-4 text-neutral-300">{pair}</td>
                    <td className="p-4 text-right font-bold">{stats.count}</td>
                    <td className="p-4 text-right text-neutral-500">{stats.volume.toLocaleString()}</td>
                  </tr>
                ))}
                {corridorPairs.size === 0 && (
                  <tr><td colSpan={3} className="p-8 text-center text-neutral-600 text-xs uppercase">No corridor data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border border-neutral-800">
            <div className="p-5 border-b border-neutral-800 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-neutral-500" />
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400">Settlement Volume</h3>
            </div>
            <div className="p-5">
              {/* ASCII-style volume bar chart */}
              <div className="space-y-3">
                {Array.from(corridorPairs.entries()).map(([pair, stats]) => {
                  const maxVol = Math.max(...Array.from(corridorPairs.values()).map(v => v.volume), 1);
                  const pct = Math.round((stats.volume / maxVol) * 100);
                  return (
                    <div key={pair} className="flex items-center gap-3">
                      <span className="text-[10px] text-neutral-500 w-16 text-right">{pair}</span>
                      <div className="flex-1 bg-neutral-900 h-5">
                        <div className="h-full bg-white" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-neutral-400 w-20">{stats.volume.toLocaleString()}</span>
                    </div>
                  );
                })}
                {corridorPairs.size === 0 && (
                  <div className="text-center text-neutral-600 text-xs uppercase py-6">No volume data</div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                <div className="border border-neutral-800 p-3">
                  <div className="text-2xl font-black">{escrows.length}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Total</div>
                </div>
                <div className="border border-neutral-800 p-3">
                  <div className="text-2xl font-black text-green-400">{completed.filter(e => e.status === "Settled").length}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Settled</div>
                </div>
                <div className="border border-neutral-800 p-3">
                  <div className="text-2xl font-black text-amber-400">{escrows.filter(e => e.status === "Created" || e.status === "CounterpartyApproved").length}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center">
          <Link href="/" className="text-[10px] uppercase tracking-[0.3em] text-neutral-700 hover:text-neutral-500 transition-colors">Home</Link>
        </div>
      </div>
    </main>
  );
}
