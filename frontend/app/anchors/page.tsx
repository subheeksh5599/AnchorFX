"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Globe, Clock } from "lucide-react";

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

const CONTRACT_ID = "CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26";

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
  const [analytics, setAnalytics] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ total: number; averageRating: string; wouldUseAgain: number; topFeatures?: Array<{ feature: string; count: number }> }>({ total: 0, averageRating: "0", wouldUseAgain: 0 });

  const fetchEscrows = useCallback(async () => {
    try {
      const [escrowsRes, analyticsRes, feedbackRes] = await Promise.all([
        fetch(`/api/escrows?contract=${CONTRACT_ID}`),
        fetch("/api/analytics/events"),
        fetch("/api/feedback"),
      ]);
      const data = await escrowsRes.json();
      setEscrows(data.escrows ?? []);
      const aData = await analyticsRes.json();
      setAnalytics(aData.metrics ?? {});
      const fData = await feedbackRes.json();
      setFeedback(fData);
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
                {r === "anchor_a" ? "Anchor A · US" : "Anchor B · Philippines"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="border border-neutral-800 p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-2">Role</div>
            <div className="text-lg font-black">{roleLabel}</div>
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

        {/* Analytics + Feedback Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8 text-center">
          <div className="border border-neutral-800 p-3">
            <div className="text-2xl font-black">{analytics.wallet_connections ?? 0}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Connections</div>
          </div>
          <div className="border border-neutral-800 p-3">
            <div className="text-2xl font-black">{analytics.escrows_created ?? 0}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Escrows</div>
          </div>
          <div className="border border-neutral-800 p-3">
            <div className="text-2xl font-black text-green-400">{analytics.settlements_completed ?? 0}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Settled</div>
          </div>
          <div className="border border-neutral-800 p-3">
            <div className="text-2xl font-black text-red-400">{analytics.refunds ?? 0}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Refunds</div>
          </div>
          <div className="border border-neutral-800 p-3">
            <div className="text-2xl font-black text-amber-400">★ {feedback.averageRating}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Rating</div>
          </div>
          <div className="border border-neutral-800 p-3">
            <div className="text-2xl font-black">{feedback.total}</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Responses</div>
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

          {/* Lifecycle Flow Visualization */}
          <div className="p-5 border-b border-neutral-800">
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-[10px] uppercase tracking-[0.2em]">
              <div className="flex items-center gap-2 border border-neutral-800 px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-400 font-bold">Created</span>
              </div>
              <span className="text-neutral-700 text-lg">↓</span>
              <div className="flex items-center gap-2 border border-neutral-800 px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-blue-400 font-bold">Counterparty Approved</span>
              </div>
              <span className="text-neutral-700 text-lg">↓</span>
              <div className="flex items-center gap-2 border border-neutral-800 px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-purple-400 font-bold">Oracle Locked</span>
              </div>
              <span className="text-neutral-700 text-lg">↓</span>
              <div className="flex items-center gap-2 border border-green-400 px-3 py-2">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-green-400 font-bold">Settled</span>
              </div>
            </div>
            {escrows.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] text-neutral-500">
                <span>⊹ Ledger #{escrows[0]?.createdAt ?? "—"}</span>
                <span>{escrows[0]?.approvedAt ? `⊹ Ledger #${escrows[0].approvedAt}` : "○ Pending"}</span>
                <span>⊹ FX rate locked</span>
                <span>{escrows[0]?.settledAt ? `⊹ Ledger #${escrows[0].settledAt}` : "○ Pending"}</span>
              </div>
            )}
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

        {/* Demo Corridor */}
        <div className="border border-white/20 bg-white/5 p-6 mb-8">
          <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400 mb-4">Demo Corridor · US → Philippines</h3>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2 text-center text-[10px]">
            {[
              { label: "US Anchor", sub: "100 XLM", color: "text-amber-400", border: "border-amber-400/30 bg-amber-400/5" },
              { label: "Escrow", sub: "Locked", color: "text-neutral-400", border: "border-neutral-800" },
              { label: "Oracle", sub: "1 XLM = 56.4 PHP", color: "text-purple-400", border: "border-purple-400/30 bg-purple-400/5" },
              { label: "PH Anchor", sub: "Notified", color: "text-blue-400", border: "border-blue-400/30 bg-blue-400/5" },
              { label: "Multi-sig", sub: "Approved", color: "text-green-400", border: "border-green-400/30 bg-green-400/5" },
              { label: "Settled", sub: "5 seconds", color: "text-green-400", border: "border-green-400/30 bg-green-400/5" },
              { label: "Audit + CSV", sub: "Exported", color: "text-neutral-400", border: "border-neutral-800" },
            ].map((step, i) => (
              <div key={i} className={`border ${step.border} p-3`}>
                <div className={`font-bold uppercase tracking-[0.15em] ${step.color} mb-1`}>{step.label}</div>
                <div className="text-neutral-500">{step.sub}</div>
                {i < 6 && <div className="hidden md:block text-neutral-700 mt-1">↓</div>}
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] text-neutral-500 leading-relaxed">
            One clean USD→PHP corridor. US Anchor creates settlement. Oracle locks FX rate. Philippines Anchor approves. Multi-sig executes. Settlement completes in ~5 seconds. Audit trail + CSV export generated.
          </p>
        </div>

        {/* FX Route Discovery */}
        <div className="border border-neutral-800 p-8 mb-8">
          <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400 mb-4">FX Route Discovery</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const from = (form.querySelector('[name=from]') as HTMLSelectElement).value;
            const to = (form.querySelector('[name=to]') as HTMLSelectElement).value;
            const amt = (form.querySelector('[name=amount]') as HTMLInputElement).value;
            const res = await fetch(`/api/fxroute?from=${from}&to=${to}&amount=${amt}`);
            const data = await res.json();
            const el = document.getElementById("fx-result");
            if (el) el.textContent = res.ok ? `${data.route} | Rate: ${data.rate} | Fee: ${data.feePercent}% | Receive: ${data.estimatedReceive} ${data.to}` : data.error || "No route";
          }} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-1">From</label>
              <select name="from" className="bg-black border border-neutral-800 text-white text-xs px-3 py-2 uppercase tracking-[0.2em]">
                <option value="US">🇺🇸 USD</option>
                <option value="EUR">🇪🇺 EUR</option>
              </select>
            </div>
            <span className="text-neutral-600 pb-2">→</span>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-1">To</label>
              <select name="to" className="bg-black border border-neutral-800 text-white text-xs px-3 py-2 uppercase tracking-[0.2em]">
                <option value="PH">🇵🇭 PHP</option>
                <option value="MX">🇲🇽 MXN</option>
                <option value="BR">🇧🇷 BRL</option>
                <option value="NG">🇳🇬 NGN</option>
                <option value="IN">🇮🇳 INR</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-1">Amount</label>
              <input name="amount" type="number" defaultValue="1000" className="bg-black border border-neutral-800 text-white text-xs px-3 py-2 w-24" />
            </div>
            <button type="submit" className="bg-white text-black px-6 py-2 text-xs uppercase tracking-[0.2em] font-bold hover:bg-neutral-200 transition-colors">Find Route</button>
          </form>
          <div id="fx-result" className="mt-4 text-xs text-neutral-300 font-mono"></div>
        </div>

        {/* Anchor Reputation + Export */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="border border-neutral-800">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400">Anchor Reputation</h3>
            </div>
            <div className="p-5">
              <div className="border border-neutral-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">Anchor A (US)</span>
                  <span className="text-[11px] text-green-400 font-bold">98% success</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-neutral-500">
                  <span>3 settlements</span>
                  <span>~5s avg time</span>
                  <span>0% refund rate</span>
                </div>
              </div>
              <div className="border border-neutral-800 p-4 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold">Anchor B (PH)</span>
                  <span className="text-[11px] text-green-400 font-bold">100% approval</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-neutral-500">
                  <span>3 received</span>
                  <span>~3s approve time</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-neutral-800">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400">Actions</h3>
            </div>
            <div className="p-5 space-y-3">
              <a
                href={`/api/export?contract=${CONTRACT_ID}&format=csv`}
                className="block w-full bg-white text-black text-xs uppercase tracking-[0.2em] font-bold py-3 text-center hover:bg-neutral-200 transition-colors"
              >
                Export CSV
              </a>
              <a
                href={`/api/export?contract=${CONTRACT_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full border border-neutral-800 text-neutral-400 text-xs uppercase tracking-[0.2em] font-bold py-3 text-center hover:text-white transition-colors"
              >
                Export JSON Report
              </a>
              <div className="border border-dashed border-neutral-800 p-4 mt-4 text-[10px] text-neutral-600 leading-relaxed">
                <p className="uppercase tracking-[0.2em] font-bold mb-1">SEP-31 Readiness</p>
                <p>Incoming settlement → Escrow created → Oracle locked → Counterparty approved → Settled.</p>
                <p className="mt-1">Mock SEP-31 receiver endpoint: <code className="text-neutral-500">POST /sep31/receive</code></p>
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
