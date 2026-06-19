import { getEscrows } from "@/lib/relay";
import { validateContractId } from "@/lib/validation";
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

const DEFAULT_CONTRACT = process.env.CONTRACT_ID ?? "CBXJRCVLWK5GGBKVC5RAFCTCDCCRRXLBXDNVRVW7YUGPLFW3K3BVXC6Y";

const CORRIDORS: Record<number, { from: string; to: string }> = {
  1: { from: "US", to: "PH" }, 2: { from: "US", to: "MX" }, 3: { from: "EUR", to: "BR" },
  4: { from: "US", to: "NG" }, 5: { from: "EUR", to: "IN" },
};

export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "export");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const url = new URL(request.url);
  const contractId = url.searchParams.get("contract") ?? DEFAULT_CONTRACT;
  const format = url.searchParams.get("format") ?? "json";
  const validation = validateContractId(contractId);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const escrows = await getEscrows(validation.sanitized!, true);

  if (format === "csv") {
    const header = "ID,Sender,Receiver,Amount,FX Rate,Corridor,Status,Created,Approved,Settled\n";
    const rows = escrows.map((e) => {
      const c = CORRIDORS[e.corridor] ?? { from: "?", to: "?" };
      return `${e.id},${e.sender},${e.receiver},${e.amount},${(e.fxRate / 100000).toFixed(4)},${c.from}→${c.to},${e.status},${e.createdAt},${e.approvedAt},${e.settledAt}`;
    }).join("\n");
    return new Response(header + rows, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="anchorfx-settlements-${contractId.slice(0, 8)}.csv"`,
        ...rateLimitHeaders(limitResult),
      },
    });
  }

  return new Response(JSON.stringify({
    contractId: validation.sanitized,
    exportedAt: new Date().toISOString(),
    settlements: escrows.map((e) => ({
      ...e,
      corridor: CORRIDORS[e.corridor] ?? { from: "?", to: "?" },
    })),
    count: escrows.length,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}
