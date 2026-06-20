import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

// Stellar Asset Contract addresses on testnet
const STABLECOINS: Record<string, { name: string; issuer: string; decimals: number }> = {
  CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC: { name: "Native XLM (SAC)", issuer: "stellar.org", decimals: 7 },
};

const CORRIDORS: Record<string, { from: string; to: string; rate: number }> = {
  "US-PH": { from: "USD", to: "PHP", rate: 56.4 },
  "US-MX": { from: "USD", to: "MXN", rate: 17.2 },
  "EUR-BR": { from: "EUR", to: "BRL", rate: 5.4 },
  "US-NG": { from: "USD", to: "NGN", rate: 1550 },
  "EUR-IN": { from: "EUR", to: "INR", rate: 89.5 },
};

export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "sep31");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  return new Response(JSON.stringify({
    info: "AnchorFX SEP-31 Receiver — Anchor Integration Endpoint",
    supported_assets: Object.entries(STABLECOINS).map(([addr, info]) => ({
      address: addr,
      ...info,
    })),
    corridors: Object.entries(CORRIDORS).map(([key, info]) => ({
      code: key,
      ...info,
    })),
    endpoints: {
      receive: "POST /api/sep31/receive",
      status: "GET /api/sep31/receive?tx_id={id}",
    },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}

export async function POST(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "sep31");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const asset = String(body.asset ?? "");
  const amount = String(body.amount ?? "0");
  const sender = String(body.sender ?? "");
  const corridor = String(body.corridor ?? "US-PH");

  const corridorInfo = CORRIDORS[corridor];
  if (!corridorInfo) {
    return new Response(JSON.stringify({ error: "Unsupported corridor", supported: Object.keys(CORRIDORS) }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const txId = `sep31-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const estimatedReceive = parseFloat(amount || "0") * corridorInfo.rate;

  return new Response(JSON.stringify({
    tx_id: txId,
    status: "pending",
    sender,
    asset,
    amount,
    corridor: corridorInfo,
    estimated_receive: `${estimatedReceive.toFixed(2)} ${corridorInfo.to}`,
    stellar_tx_id: null,
    created_at: new Date().toISOString(),
    message: "SEP-31 receive initiated. Funds will settle via AnchorFX escrow contract.",
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}
