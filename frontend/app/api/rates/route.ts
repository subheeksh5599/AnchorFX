import { getOracleRates } from "@/lib/relay";
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";
import { validateContractId } from "@/lib/validation";
import { ORACLE_ID } from "@/lib/env";

export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "rates");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...rateLimitHeaders(limitResult),
      },
    });
  }

  const url = new URL(request.url);
  const oracleId = url.searchParams.get("oracle") ?? ORACLE_ID;
  const validation = validateContractId(oracleId);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rates = await getOracleRates(validation.sanitized!);

  return new Response(JSON.stringify({ rates, count: rates.length }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=10",
      ...rateLimitHeaders(limitResult),
    },
  });
}
