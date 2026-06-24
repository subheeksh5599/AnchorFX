import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/env";

export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "sep31");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const url = new URL(request.url);
  const txId = url.searchParams.get("tx_id") || url.searchParams.get("id");

  if (!txId) {
    return new Response(JSON.stringify({ error: "tx_id parameter required" }), {
      status: 400, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  // Forward to the SEP-31 info endpoint which handles transaction lookup
  const response = await fetch(`${SITE_URL}/api/sep31/receive?tx_id=${encodeURIComponent(txId)}`, {
    headers: { "Accept": "application/json" },
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}
