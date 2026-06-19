import { getEscrows } from "@/lib/relay";
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";
import { validateContractId } from "@/lib/validation";

const DEFAULT_CONTRACT = process.env.CONTRACT_ID ?? "CB4U7NLHDRGQQEKBNJ7GBPMXW4AA2VGTGEURS2FF34ZCRJMVOCFBKE26";

export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "escrows");
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
      headers: { "Content-Type": "application/json" },
    });
  }

  const escrows = await getEscrows(validation.sanitized!, true);

  return new Response(JSON.stringify({ escrows, count: escrows.length }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=10",
      ...rateLimitHeaders(limitResult),
    },
  });
}
