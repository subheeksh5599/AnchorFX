import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

// In-memory analytics counters (reset on cold start, acceptable for testnet MVP)
const counters: Record<string, number> = {
  page_views: 0,
  wallet_connections: 0,
  escrows_created: 0,
  settlements_completed: 0,
  refunds: 0,
  api_calls: 0,
};

let startTime = Date.now();

export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "analytics");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  counters.api_calls = (counters.api_calls ?? 0) + 1;

  return new Response(JSON.stringify({
    metrics: counters,
    uptime: Math.round((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}

export async function POST(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.wallet, "analytics_write");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const event = String(body.event ?? "");
  const validEvents = ["page_view", "wallet_connection", "escrow_created", "settlement_completed", "refund"];
  if (!validEvents.includes(event)) {
    return new Response(JSON.stringify({ error: "Invalid event", valid: validEvents }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // Map event names to counter keys
  const keyMap: Record<string, string> = {
    page_view: "page_views",
    wallet_connection: "wallet_connections",
    escrow_created: "escrows_created",
    settlement_completed: "settlements_completed",
    refund: "refunds",
  };

  const key = keyMap[event]!;
  counters[key] = (counters[key] ?? 0) + 1;

  return new Response(JSON.stringify({
    tracked: event,
    total: counters[key],
    all: counters,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}
