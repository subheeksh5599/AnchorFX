// Shared RPC utilities for AnchorFX relay service
// Handles escrow queries, event aggregation, and contract health
import { Server as RpcServer } from "@stellar/stellar-sdk/rpc";
import { Address, xdr, scValToNative } from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";

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
  timeoutLedger: number;
  status: string;
  createdAt: number;
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
  error?: string;
}

// Cache for RPC queries (5s TTL)
let escrowCache: { data: EscrowRecord[]; timestamp: number } | null = null;
let analyticsCache: { data: AnalyticsSummary; timestamp: number } | null = null;

const CACHE_TTL = 5000;

// Query the escrow contract for escrow count and individual escrows
export async function getEscrows(contractId: string, forceRefresh = false): Promise<EscrowRecord[]> {
  if (escrowCache && !forceRefresh && Date.now() - escrowCache.timestamp < CACHE_TTL) {
    return escrowCache.data;
  }

  const rpc = createRpc();
  const results: EscrowRecord[] = [];

  try {
    // Read the ESCROWS map from persistent storage
    const escrowsKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(contractId).toScAddress(),
        key: xdr.ScVal.scvSymbol("ESCROWS"),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );

    const escrowsResult = await rpc.getLedgerEntries(escrowsKey);
    if (escrowsResult.entries?.length) {
      const raw = scValToNative(escrowsResult.entries[0]!.val.contractData().val());
      if (raw && typeof raw === "object") {
        const map = raw as Array<{ key: unknown; val: Record<string, unknown> }>;
        if (Array.isArray(map)) {
          for (const entry of map) {
            const id = Number(entry.key);
            const val = entry.val;
            results.push({
              id,
              sender: String(val.sender ?? ""),
              receiver: String(val.receiver ?? ""),
              token: String(val.token ?? ""),
              amount: String(val.amount ?? "0"),
              fxRate: Number(val.fx_rate ?? 0),
              timeoutLedger: Number(val.timeout_ledger ?? 0),
              status: String(val.status ?? "unknown"),
              createdAt: Number(val.created_at ?? 0),
            });
          }
        }
      }
    }

    escrowCache = { data: results, timestamp: Date.now() };
  } catch {
    if (escrowCache) return escrowCache.data;
    return [];
  }

  return results;
}

export async function getAnalytics(contractId: string): Promise<AnalyticsSummary> {
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
      case "Created": activeCount++; break;
      case "Settled": settledCount++; break;
      case "Refunded": refundedCount++; break;
      case "Cancelled": cancelledCount++; break;
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
  } catch { /* ignore */ }

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
  let error: string | undefined;

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
    error = e instanceof Error ? e.message : "Unknown error";
    if (error.includes("contract") || error.includes("not found")) {
      contractStatus = "not_found";
    }
  }

  return {
    rpc: rpcStatus,
    contract: contractStatus,
    uptime: Date.now() - startTime,
    lastLedger,
    escrowCount,
    error,
  };
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
  } catch { /* ignore */ }

  return events;
}
