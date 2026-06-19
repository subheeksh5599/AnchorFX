import { getEscrows } from "@/lib/relay";
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";
import { validateContractId } from "@/lib/validation";

const DEFAULT_CONTRACT = process.env.CONTRACT_ID ?? "CBXJRCVLWK5GGBKVC5RAFCTCDCCRRXLBXDNVRVW7YUGPLFW3K3BVXC6Y";

interface AnchorRep {
  address: string;
  completed: number;
  total: number;
  refunded: number;
  avgSettlementLedgers: number;
  successRate: number;
}

export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "reputation");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const url = new URL(request.url);
  const contractId = url.searchParams.get("contract") ?? DEFAULT_CONTRACT;
  const validation = validateContractId(contractId);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const escrows = await getEscrows(validation.sanitized!, true);

  const anchors = new Map<string, { completed: number; total: number; refunded: number; settlementLedgers: number[] }>();
  for (const e of escrows) {
    const key = e.sender;
    const prev = anchors.get(key) ?? { completed: 0, total: 0, refunded: 0, settlementLedgers: [] };
    prev.total++;
    if (e.status === "Settled") {
      prev.completed++;
      if (e.settledAt > 0 && e.createdAt > 0) prev.settlementLedgers.push(e.settledAt - e.createdAt);
    }
    if (e.status === "Refunded") prev.refunded++;
    anchors.set(key, prev);
  }

  const results: AnchorRep[] = Array.from(anchors.entries()).map(([addr, stats]) => ({
    address: addr.slice(0, 6) + "..." + addr.slice(-4),
    completed: stats.completed,
    total: stats.total,
    refunded: stats.refunded,
    avgSettlementLedgers: stats.settlementLedgers.length
      ? Math.round(stats.settlementLedgers.reduce((a, b) => a + b, 0) / stats.settlementLedgers.length)
      : 0,
    successRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
  }));

  return new Response(JSON.stringify({ anchors: results }), {
    status: 200, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}
