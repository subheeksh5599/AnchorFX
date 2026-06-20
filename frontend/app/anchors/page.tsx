"use client";

import { useState, useEffect, useCallback, type ReactNode, type FormEvent } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Globe, Clock, Plus, RefreshCw, Shield, ArrowRight, Ban, Undo, X } from "lucide-react";
import { useWallet } from "@/components/wallet-provider";
import {
  createEscrow,
  counterpartyApprove,
  settleEscrow,
  refundEscrow,
  cancelEscrow,
  approveTokenTransfer,
  NATIVE_XLM_SAC,
  type TxStatus,
} from "@/lib/contract-client";

type AnchorRole = "anchor_a" | "anchor_b";

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

const CONTRACT_ID = "CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26";

const CORRIDORS: Record<number, { from: string; to: string }> = {
  1: { from: "US", to: "PH" },
  2: { from: "US", to: "MX" },
  3: { from: "EUR", to: "BR" },
  4: { from: "US", to: "NG" },
  5: { from: "EUR", to: "IN" },
};

const CORRIDOR_OPTIONS = [
  { value: 1, label: "US → PH" },
  { value: 2, label: "US → MX" },
  { value: 3, label: "EUR → BR" },
  { value: 4, label: "US → NG" },
  { value: 5, label: "EUR → IN" },
];

export default function AnchorsPage(): ReactNode {
  const { wallet, balance } = useWallet();
  const [role, setRole] = useState<AnchorRole>("anchor_a");
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [approvalStep, setApprovalStep] = useState<"idle" | "approving" | "creating">("idle");

  // Create form state
  const [createForm, setCreateForm] = useState({
    receiver: "",
    token: NATIVE_XLM_SAC,
    amount: "100",
    timeout: "5000",
    corridor: 1,
  });

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

  const connected = wallet.connected;
  const publicKey = wallet.publicKey;

  const myEscrows = escrows.filter((e) => e.sender === publicKey || e.receiver === publicKey);
  const isAdmin = publicKey === "GC3Z6XEDF25KKJGGKF6V4ALMWWLWOD3KHKYM3DO5WJJTVHXJMEY64BWF";

  const pendingForMe = escrows.filter((e) => {
    if (isAdmin) return e.status === "Created" || e.status === "CounterpartyApproved";
    if (e.sender === publicKey)
      return e.status === "Created" || e.status === "CounterpartyApproved";
    if (e.receiver === publicKey) return e.status === "Created";
    return false;
  });

  const completed = escrows.filter(
    (e) => e.status === "Settled" || e.status === "Refunded" || e.status === "Cancelled",
  );

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

  const statusBg = (status: string) => {
    switch (status) {
      case "Created": return "bg-amber-400";
      case "CounterpartyApproved": return "bg-blue-400";
      case "Settled": return "bg-green-400";
      case "Refunded": return "bg-red-400";
      case "Cancelled": return "bg-neutral-500";
      default: return "bg-neutral-400";
    }
  };

  // ── Actions ──

  const handleAction = async (
    action: "approve" | "settle" | "refund" | "cancel",
    escrowId: number,
  ) => {
    if (!wallet.walletType || !wallet.publicKey) return;
    setTxStatus({ status: "building" });

    const onStatus = (s: TxStatus) => setTxStatus(s);
    let result: TxStatus;

    switch (action) {
      case "approve":
        result = await counterpartyApprove(wallet.publicKey, wallet.walletType, CONTRACT_ID, escrowId, onStatus);
        break;
      case "settle":
        result = await settleEscrow(wallet.publicKey, wallet.walletType, CONTRACT_ID, escrowId, onStatus);
        break;
      case "refund":
        result = await refundEscrow(wallet.publicKey, wallet.walletType, CONTRACT_ID, escrowId, onStatus);
        break;
      case "cancel":
        result = await cancelEscrow(wallet.publicKey, wallet.walletType, CONTRACT_ID, escrowId, onStatus);
        break;
    }

    if (result.status === "success") {
      setTimeout(() => { setTxStatus(null); fetchEscrows(); }, 2000);
    }
  };

  const handleCreateEscrow = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet.walletType || !wallet.publicKey) return;

    setApprovalStep("approving");
    setTxStatus({ status: "building" });

    const amountStroops = BigInt(parseInt(createForm.amount, 10)) * BigInt(10_000_000);

    // Step 1: Approve token transfer
    const approveResult = await approveTokenTransfer(
      wallet.publicKey,
      wallet.walletType,
      createForm.token,
      CONTRACT_ID,
      amountStroops * BigInt(2),
      (s) => setTxStatus(s),
    );

    if (approveResult.status !== "success") {
      setApprovalStep("idle");
      return;
    }

    await new Promise((r) => setTimeout(r, 4000));
    setApprovalStep("creating");

    // Step 2: Create escrow
    const result = await createEscrow(
      wallet.publicKey,
      wallet.walletType,
      CONTRACT_ID,
      createForm.receiver,
      createForm.token,
      amountStroops,
      parseInt(createForm.timeout, 10),
      createForm.corridor,
      (s) => setTxStatus(s),
    );

    if (result.status === "success") {
      setApprovalStep("idle");
      setShowCreate(false);
      setTxStatus(null);
      fetchEscrows();
    } else {
      setApprovalStep("idle");
    }
  };

  const short = (str: string, n = 6) =>
    str.length > n * 2 ? `${str.slice(0, n)}...${str.slice(-4)}` : str;

  const canApprove = (e: EscrowRecord) =>
    connected && e.status === "Created" && (e.receiver === publicKey || isAdmin);

  const canSettle = (e: EscrowRecord) =>
    connected && isAdmin && (e.status === "Created" || e.status === "CounterpartyApproved");

  const canRefund = (e: EscrowRecord) =>
    connected && e.sender === publicKey && (e.status === "Created" || e.status === "CounterpartyApproved");

  const canCancel = (e: EscrowRecord) =>
    connected && isAdmin && e.status === "Created";

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

        <hr className="border-neutral-800 mb-8" />

        {/* Wallet Status */}
        <div className="border border-neutral-800 p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
              <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-400">
                {connected ? "Connected" : "Not Connected"}
              </span>
              {connected && publicKey && (
                <span className="text-xs font-mono text-neutral-500">{short(publicKey)}</span>
              )}
              {connected && (
                <span className="text-xs text-neutral-600">{balance} XLM</span>
              )}
            </div>
            {!connected && (
              <Link href="/wallet" className="text-[10px] uppercase tracking-[0.2em] text-amber-400 hover:text-amber-300 border-b border-amber-400/30 hover:border-amber-400 pb-0.5 transition-colors">
                Connect Wallet
              </Link>
            )}
            {isAdmin && connected && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-purple-400 border border-purple-400/30 px-2 py-0.5">Admin</span>
            )}
          </div>
        </div>

        {/* Role Selector */}
        <div className="border border-neutral-800 p-5 mb-6">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="border border-neutral-800 p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-2">My Escrows</div>
            <div className="text-4xl font-black">{myEscrows.length}</div>
          </div>
          <div className="border border-neutral-800 p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-2">Pending</div>
            <div className="text-4xl font-black text-amber-400">{pendingForMe.length}</div>
          </div>
          <div className="border border-neutral-800 p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-2">Settled</div>
            <div className="text-4xl font-black text-green-400">{completed.filter(e => e.status === "Settled").length}</div>
          </div>
          <div className="border border-neutral-800 p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-2">Total</div>
            <div className="text-4xl font-black">{escrows.length}</div>
          </div>
        </div>

        {/* TX Status Bar */}
        {txStatus && (
          <div className={`border p-4 mb-6 flex items-center gap-3 text-xs ${
            txStatus.status === "failed" ? "border-red-400/50 bg-red-400/5" :
            txStatus.status === "success" ? "border-green-400/50 bg-green-400/5" :
            "border-amber-400/50 bg-amber-400/5"
          }`}>
            <RefreshCw className={`h-4 w-4 ${txStatus.status === "pending" || txStatus.status === "submitting" ? "animate-spin" : ""} ${
              txStatus.status === "failed" ? "text-red-400" : txStatus.status === "success" ? "text-green-400" : "text-amber-400"
            }`} />
            <span className="uppercase tracking-[0.2em] font-bold">{txStatus.status}</span>
            {txStatus.hash && (
              <a href={`https://stellar.expert/explorer/testnet/tx/${txStatus.hash}`} target="_blank" rel="noopener noreferrer"
                className="text-neutral-500 hover:text-white font-mono">{short(txStatus.hash, 10)}</a>
            )}
            {txStatus.error && <span className="text-red-400">{txStatus.error}</span>}
            <button onClick={() => setTxStatus(null)} className="ml-auto text-neutral-600 hover:text-white"><X className="h-3 w-3" /></button>
          </div>
        )}

        {/* Create Escrow */}
        <div className="border border-neutral-800 mb-6">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-full p-5 flex items-center justify-between hover:bg-neutral-900/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Plus className="h-4 w-4 text-neutral-500" />
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400">Create Escrow</h3>
            </div>
            <span className="text-neutral-600 text-xs">{showCreate ? "−" : "+"}</span>
          </button>

          {showCreate && (
            <div className="p-5 border-t border-neutral-800">
              {!connected ? (
                <p className="text-xs text-neutral-500">Connect your wallet to create an escrow.</p>
              ) : (
                <form onSubmit={handleCreateEscrow} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-1">Sender (You)</label>
                      <input readOnly value={publicKey ?? ""}
                        className="w-full bg-neutral-900 border border-neutral-800 text-neutral-500 text-xs px-3 py-2 font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-1">Receiver Address</label>
                      <input required name="receiver" value={createForm.receiver}
                        onChange={(e) => setCreateForm((f) => ({ ...f, receiver: e.target.value }))}
                        placeholder="G..."
                        className="w-full bg-black border border-neutral-800 text-white text-xs px-3 py-2 font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-1">Token (SAC)</label>
                      <input required name="token" value={createForm.token}
                        onChange={(e) => setCreateForm((f) => ({ ...f, token: e.target.value }))}
                        className="w-full bg-black border border-neutral-800 text-white text-xs px-3 py-2 font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-1">Corridor</label>
                      <select name="corridor" value={createForm.corridor}
                        onChange={(e) => setCreateForm((f) => ({ ...f, corridor: parseInt(e.target.value, 10) }))}
                        className="w-full bg-black border border-neutral-800 text-white text-xs px-3 py-2">
                        {CORRIDOR_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-1">Amount (XLM / Token units)</label>
                      <input required name="amount" type="number" min="1" value={createForm.amount}
                        onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))}
                        className="w-full bg-black border border-neutral-800 text-white text-xs px-3 py-2" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-1">Timeout (ledgers)</label>
                      <input required name="timeout" type="number" min="100" value={createForm.timeout}
                        onChange={(e) => setCreateForm((f) => ({ ...f, timeout: e.target.value }))}
                        className="w-full bg-black border border-neutral-800 text-white text-xs px-3 py-2" />
                    </div>
                  </div>

                  <button type="submit"
                    disabled={approvalStep !== "idle"}
                    className="bg-white text-black text-xs uppercase tracking-[0.2em] font-bold px-8 py-3 hover:bg-neutral-200 transition-colors disabled:opacity-50">
                    {approvalStep === "approving" ? "Approving token..." : approvalStep === "creating" ? "Creating escrow..." : "Create Escrow"}
                  </button>
                  {approvalStep !== "idle" && (
                    <p className="text-[10px] text-neutral-500 mt-2">Step 1: Approve token transfer. Step 2: Create escrow on-chain.</p>
                  )}
                </form>
              )}
            </div>
          )}
        </div>

        {/* Escrow Table */}
        <div className="border border-neutral-800 mb-8">
          <div className="p-5 border-b border-neutral-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-500" />
            <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400">
              All Escrows ({escrows.length})
            </h3>
          </div>

          {loading && escrows.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-600 uppercase">Loading...</div>
          ) : escrows.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-600">No escrows yet. Create one above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    <th className="text-left p-4 font-bold">ID</th>
                    <th className="text-left p-4 font-bold">Corridor</th>
                    <th className="text-left p-4 font-bold">Parties</th>
                    <th className="text-right p-4 font-bold">Amount</th>
                    <th className="text-right p-4 font-bold">FX Rate</th>
                    <th className="text-center p-4 font-bold">Status</th>
                    <th className="text-center p-4 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {escrows.map((e) => {
                    const c = CORRIDORS[e.corridor] ?? { from: "??", to: "??" };
                    return (
                      <tr key={e.id} className="border-b border-neutral-900 hover:bg-neutral-900/30">
                        <td className="p-4 text-neutral-400">#{e.id}</td>
                        <td className="p-4 text-neutral-300">{c.from} → {c.to}</td>
                        <td className="p-4 text-neutral-500 font-mono text-[10px]">
                          <div>S: {short(e.sender)}</div>
                          <div>R: {short(e.receiver)}</div>
                        </td>
                        <td className="p-4 text-right font-bold">{parseInt(e.amount, 10).toLocaleString()}</td>
                        <td className="p-4 text-right text-neutral-500">{e.fxRate ? (e.fxRate / 100000).toFixed(4) : "—"}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] font-bold ${statusColor(e.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusBg(e.status)}`} />
                            {e.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            {canApprove(e) && (
                              <button onClick={() => handleAction("approve", e.id)}
                                className="text-[10px] uppercase tracking-[0.1em] text-blue-400 hover:text-white border border-blue-400/30 hover:border-blue-400 px-2 py-1 transition-colors"
                                title="Counterparty Approve">
                                <Shield className="h-3 w-3 inline mr-1" />Approve
                              </button>
                            )}
                            {canSettle(e) && (
                              <button onClick={() => handleAction("settle", e.id)}
                                className="text-[10px] uppercase tracking-[0.1em] text-green-400 hover:text-white border border-green-400/30 hover:border-green-400 px-2 py-1 transition-colors"
                                title="Settle">
                                <ArrowRight className="h-3 w-3 inline mr-1" />Settle
                              </button>
                            )}
                            {canRefund(e) && (
                              <button onClick={() => handleAction("refund", e.id)}
                                className="text-[10px] uppercase tracking-[0.1em] text-red-400 hover:text-white border border-red-400/30 hover:border-red-400 px-2 py-1 transition-colors"
                                title="Refund">
                                <Undo className="h-3 w-3 inline mr-1" />Refund
                              </button>
                            )}
                            {canCancel(e) && (
                              <button onClick={() => handleAction("cancel", e.id)}
                                className="text-[10px] uppercase tracking-[0.1em] text-neutral-500 hover:text-white border border-neutral-700 hover:border-neutral-500 px-2 py-1 transition-colors"
                                title="Cancel">
                                <Ban className="h-3 w-3 inline mr-1" />Cancel
                              </button>
                            )}
                            {connected && !canApprove(e) && !canSettle(e) && !canRefund(e) && !canCancel(e) && (
                              <span className="text-[10px] text-neutral-700">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

        {/* Export */}
        <div className="border border-neutral-800 mb-8">
          <div className="p-5 border-b border-neutral-800">
            <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-neutral-400">Export & Audit</h3>
          </div>
          <div className="p-5 flex gap-3">
            <a href={`/api/export?contract=${CONTRACT_ID}&format=csv`}
              className="bg-white text-black text-xs uppercase tracking-[0.2em] font-bold px-6 py-3 hover:bg-neutral-200 transition-colors">
              Export CSV
            </a>
            <a href={`/api/export?contract=${CONTRACT_ID}`} target="_blank" rel="noopener noreferrer"
              className="border border-neutral-800 text-neutral-400 text-xs uppercase tracking-[0.2em] font-bold px-6 py-3 hover:text-white transition-colors">
              Export JSON
            </a>
          </div>
        </div>

        <div className="mt-20 text-center">
          <Link href="/" className="text-[10px] uppercase tracking-[0.3em] text-neutral-700 hover:text-neutral-500 transition-colors">Home</Link>
        </div>
      </div>
    </main>
  );
}
