import { getEvents } from "@/lib/relay";
import { validateContractId } from "@/lib/validation";
import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

const DEFAULT_CONTRACT = process.env.CONTRACT_ID ?? "CBXJRCVLWK5GGBKVC5RAFCTCDCCRRXLBXDNVRVW7YUGPLFW3K3BVXC6Y";

export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "audit");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const url = new URL(request.url);
  const contractId = url.searchParams.get("contract") ?? DEFAULT_CONTRACT;
  const escrowId = parseInt(url.searchParams.get("id") ?? "1", 10);

  const validation = validateContractId(contractId);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const events = await getEvents(validation.sanitized!);

  // Filter events for this escrow and build timeline
  const timeline = events
    .filter((e) => {
      if (typeof e.data === "string") return e.data.includes(String(escrowId));
      return true;
    })
    .map((e) => ({
      type: e.type,
      ledger: e.ledger,
      timestamp: new Date().toISOString(),
      data: e.data,
    }));

  // Add synthetic timeline entries based on known escrow lifecycle
  const stages = [
    { stage: "Created", detail: "Escrow initialized — funds locked in Soroban contract" },
    { stage: "Oracle Rate Locked", detail: "FX rate locked via AnchorFX Oracle contract" },
    { stage: "Counterparty Approved", detail: "Receiving anchor approved settlement terms" },
    { stage: "Settled", detail: "Funds transferred to receiver — settlement complete" },
  ];

  return new Response(JSON.stringify({
    escrowId,
    contractId: validation.sanitized,
    timeline,
    stages: stages.map((s, i) => ({
      ...s,
      index: i + 1,
      completed: timeline.some((t) =>
        t.type.toLowerCase().includes(s.stage.toLowerCase().replace(/\s/g, ""))
      ),
    })),
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}
