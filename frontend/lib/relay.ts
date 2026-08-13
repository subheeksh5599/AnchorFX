// Shared RPC utilities for AnchorFX relay service
// Handles escrow queries, event aggregation, and contract health
import { Server as RpcServer } from "@stellar/stellar-sdk/rpc";
import {
  Address,
  Account,
  Contract,
  TransactionBuilder,
  xdr,
  scValToNative,
} from "@stellar/stellar-sdk";
import { RPC_URL } from "./env";

const NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015";

function scvU64(n: number): xdr.ScVal {
  return xdr.ScVal.scvU64(new xdr.Uint64(n));
}

export function createRpc(): RpcServer {
  return new RpcServer(RPC_URL, { allowHttp: false });
}

export interface EscrowRecord {
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

export interface EventRecord {
  type: string;
  ledger: number;
  timestamp: number;
  data: unknown;
}

export interface AnalyticsSummary {
  totalEscrows: number;
  settledCount: number;
  refundedCount: number;
  cancelledCount: number;
  activeCount: number;
  totalVolume: string;
  events24h: number;
  lastLedger: number;
}

export interface HealthStatus {
  rpc: "connected" | "error";
  contract: "active" | "not_found" | "error";
  uptime: number;
  lastLedger: number;
  escrowCount: number;
}

// Cache for RPC queries (5s TTL)
let escrowCache: { data: EscrowRecord[]; timestamp: number } | null = null;
let analyticsCache: { data: AnalyticsSummary; timestamp: number } | null = null;

const CACHE_TTL = 5000;

// Query the escrow contract for escrow count and individual escrows.
// Reads via contract calls (list_escrows + get_escrow) — matches the
// per-escrow storage layout of the deployed contract.
export async function getEscrows(
  contractId: string,
  forceRefresh = false
): Promise<EscrowRecord[]> {
  if (
    escrowCache &&
    !forceRefresh &&
    Date.now() - escrowCache.timestamp < CACHE_TTL
  ) {
    return escrowCache.data;
  }

  const rpc = createRpc();
  const results: EscrowRecord[] = [];

  try {
    const contract = new Contract(contractId);
    const sourcePublicKey =
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const fakeAccount = new Account(sourcePublicKey, "1");

    // 1. Get the count
    const countTx = new TransactionBuilder(fakeAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("escrow_count"))
      .setTimeout(30)
      .build();

    const countSim = await rpc.simulateTransaction(countTx);
    if (!countSim || "error" in countSim || !countSim.result?.retval) {
      return [];
    }
    const count = Number(scValToNative(countSim.result.retval));
    if (count === 0) return [];

    // 2. List ids 1..count
    const listTx = new TransactionBuilder(fakeAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call("list_escrows", scvU64(1), scvU64(Math.min(count, 1000)))
      )
      .setTimeout(30)
      .build();

    const listSim = await rpc.simulateTransaction(listTx);
    if (!listSim || "error" in listSim || !listSim.result?.retval) return [];
    const ids = (scValToNative(listSim.result.retval) as unknown[]) ?? [];

    // 3. Fetch each escrow (parallel, small batches)
    const BATCH = 5;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const sims = await Promise.all(
        batch.map(async (id) => {
          const tx = new TransactionBuilder(fakeAccount, {
            fee: "100",
            networkPassphrase: NETWORK_PASSPHRASE,
          })
            .addOperation(contract.call("get_escrow", scvU64(Number(id))))
            .setTimeout(30)
            .build();
          try {
            const sim = await rpc.simulateTransaction(tx);
            if (!sim || "error" in sim || !sim.result?.retval) return null;
            const val = scValToNative(sim.result.retval) as Record<
              string,
              unknown
            > | null;
            if (!val || typeof val !== "object") return null;
            return {
              id: Number(id),
              sender: String(val.sender ?? ""),
              receiver: String(val.receiver ?? ""),
              token: String(val.token ?? ""),
              amount: String(val.amount ?? "0"),
              fxRate: Number(val.fx_rate ?? 0),
              corridor: Number(val.corridor ?? 0),
              timeoutLedger: Number(val.timeout_ledger ?? 0),
              status: String(val.status ?? "unknown"),
              createdAt: Number(val.created_at ?? 0),
              approvedAt: Number(val.approved_at ?? 0),
              settledAt: Number(val.settled_at ?? 0),
            } as EscrowRecord;
          } catch {
            return null;
          }
        })
      );
      for (const r of sims) if (r) results.push(r);
    }
  } catch {
    console.error("Failed to list escrows via contract calls");
    if (escrowCache) return escrowCache.data;
    return [];
  }

  escrowCache = { data: results, timestamp: Date.now() };
  return results;
}

export async function getAnalytics(
  contractId: string
): Promise<AnalyticsSummary> {
  if (analyticsCache && Date.now() - analyticsCache.timestamp < CACHE_TTL) {
    return analyticsCache.data;
  }

  const escrows = await getEscrows(contractId);
  const rpc = createRpc();

  let totalVolume = 0;
  let settledCount = 0;
  let refundedCount = 0;
  let cancelledCount = 0;
  let activeCount = 0;

  for (const e of escrows) {
    totalVolume += parseInt(e.amount, 10) || 0;
    switch (e.status) {
      case "Created":
        activeCount++;
        break;
      case "Settled":
        settledCount++;
        break;
      case "Refunded":
        refundedCount++;
        break;
      case "Cancelled":
        cancelledCount++;
        break;
    }
  }

  let lastLedger = 0;
  let events24h = 0;
  try {
    const events = await rpc.getEvents({
      filters: [{ type: "contract" as const, contractIds: [contractId] }],
      cursor: "",
      limit: 100,
    });
    lastLedger = events.latestLedger ?? 0;
    events24h = events.events.length;
  } catch {
    console.error("Failed to get analytics events");
  }

  const summary: AnalyticsSummary = {
    totalEscrows: escrows.length,
    settledCount,
    refundedCount,
    cancelledCount,
    activeCount,
    totalVolume: totalVolume.toString(),
    events24h,
    lastLedger,
  };

  analyticsCache = { data: summary, timestamp: Date.now() };
  return summary;
}

export async function getHealth(contractId: string): Promise<HealthStatus> {
  const rpc = createRpc();
  const startTime = Date.now();

  let rpcStatus: "connected" | "error" = "error";
  let contractStatus: "active" | "not_found" | "error" = "error";
  let lastLedger = 0;
  let escrowCount = 0;

  try {
    const network = await rpc.getNetwork();
    if (network.passphrase) {
      rpcStatus = "connected";
    }

    const escrows = await getEscrows(contractId, true);
    escrowCount = escrows.length;
    contractStatus = "active";
    lastLedger = escrows.reduce((max, e) => Math.max(max, e.createdAt), 0);
  } catch (e) {
    console.error("Health check error:", e);
    if (String(e).includes("contract") || String(e).includes("not found")) {
      contractStatus = "not_found";
    }
  }

  return {
    rpc: rpcStatus,
    contract: contractStatus,
    uptime: Date.now() - startTime,
    lastLedger,
    escrowCount,
  };
}

export interface OracleRate {
  token: string;
  rate: number;
  updatedAt: number;
  expiresAt: number;
}

// Known corridor tokens (address -> label) for the oracle rates page.
// Falls back to the on-chain RATES map keyed by token address.
const KNOWN_TOKENS: Record<string, { symbol: string; corridor: string }> = {};

export async function getOracleRates(oracleId: string): Promise<OracleRate[]> {
  const rpc = createRpc();

  try {
    const ratesKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(oracleId).toScAddress(),
        key: xdr.ScVal.scvSymbol("RATES"),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    const result = await rpc.getLedgerEntries(ratesKey);
    if (!result.entries?.length) return [];

    const raw = scValToNative(result.entries[0]!.val.contractData().val());
    if (!raw || typeof raw !== "object") return [];

    const entries = Array.isArray(raw)
      ? (raw as Array<{ key: unknown; val: Record<string, unknown> }>)
      : Object.entries(raw as Record<string, Record<string, unknown>>).map(
          ([k, v]) => ({ key: k, val: v })
        );

    const rates: OracleRate[] = [];
    for (const entry of entries) {
      const token = String(entry.key);
      const val = entry.val;
      if (!val || typeof val !== "object") continue;
      rates.push({
        token,
        rate: Number(val.rate ?? 0),
        updatedAt: Number(val.updated_at ?? 0),
        expiresAt: Number(val.expires_at ?? 0),
      });
    }
    return rates;
  } catch {
    return [];
  }
}

export function tokenLabel(token: string): string {
  if (KNOWN_TOKENS[token]) return KNOWN_TOKENS[token]!.symbol;
  return token.slice(0, 6) + "…" + token.slice(-4);
}

// Event subscription with cursor persistence
const eventCursors: Map<string, string> = new Map();

export async function getEvents(contractId: string): Promise<EventRecord[]> {
  const rpc = createRpc();
  const events: EventRecord[] = [];

  try {
    const cursor = eventCursors.get(contractId);
    const response = await rpc.getEvents({
      filters: [{ type: "contract" as const, contractIds: [contractId] }],
      cursor: cursor ?? "",
      limit: 200,
    });

    for (const event of response.events) {
      const rawType = event.topic[0]?.toString() ?? "unknown";
      const type = rawType.replace(/^Symbol\(\)/, "").replace(/^"(.*)"$/, "");

      events.push({
        type,
        ledger: event.ledger ?? 0,
        timestamp: Date.now(),
        data: event.value,
      });
    }

    if (response.cursor) {
      eventCursors.set(contractId, response.cursor);
    }
  } catch {
    /* ignore */
  }

  return events;
}
