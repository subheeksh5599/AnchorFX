import { getHealth } from "@/lib/relay";
import { validateContractId } from "@/lib/validation";
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

const DEFAULT_CONTRACT = process.env.CONTRACT_ID ?? "CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26";

export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "health");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const url = new URL(request.url);
  const contractId = url.searchParams.get("contract") ?? DEFAULT_CONTRACT;
  const validation = validateContractId(contractId);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const health = await getHealth(validation.sanitized!);
  const healthy = health.rpc === "connected" && health.contract === "active";

  return new Response(JSON.stringify({ healthy, ...health }), {
    status: healthy ? 200 : 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", ...rateLimitHeaders(limitResult) },
  });
}
