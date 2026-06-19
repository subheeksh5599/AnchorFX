import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

interface Route {
  from: string;
  to: string;
  path: string[];
  rate: number;
  feePercent: number;
  estimatedReceive: number;
}

const ROUTES: Record<string, Route> = {
  "US_PH": { from: "USD", to: "PHP", path: ["USDC", "XLM", "PHPC"], rate: 56.4, feePercent: 0.15, estimatedReceive: 0 },
  "US_MX": { from: "USD", to: "MXN", path: ["USDC", "XLM", "MXNC"], rate: 17.2, feePercent: 0.12, estimatedReceive: 0 },
  "EUR_BR": { from: "EUR", to: "BRL", path: ["EURC", "XLM", "BRLC"], rate: 5.8, feePercent: 0.18, estimatedReceive: 0 },
  "US_NG": { from: "USD", to: "NGN", path: ["USDC", "XLM", "NGNC"], rate: 1580, feePercent: 0.20, estimatedReceive: 0 },
  "EUR_IN": { from: "EUR", to: "INR", path: ["EURC", "XLM", "INRC"], rate: 92.0, feePercent: 0.10, estimatedReceive: 0 },
};

export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "fxroute");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const url = new URL(request.url);
  const from = (url.searchParams.get("from") ?? "US").toUpperCase();
  const to = (url.searchParams.get("to") ?? "PH").toUpperCase();
  const amount = parseFloat(url.searchParams.get("amount") ?? "1000") || 1000;

  const key = `${from}_${to}`;
  const route = ROUTES[key];
  if (!route) {
    return new Response(JSON.stringify({ error: `No route found for ${from}→${to}`, available: Object.keys(ROUTES).map(k => k.replace("_", "→")) }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });
  }

  const estimatedReceive = amount * route.rate * (1 - route.feePercent / 100);
  const feeAmount = amount * route.rate * (route.feePercent / 100);

  return new Response(JSON.stringify({
    from: route.from, to: route.to, amount,
    path: route.path, rate: route.rate,
    feePercent: route.feePercent, feeAmount: Math.round(feeAmount * 100) / 100,
    estimatedReceive: Math.round(estimatedReceive * 100) / 100,
    route: `${route.from} → ${route.path.join(" → ")} → ${route.to}`,
    settlementTime: "~5 seconds",
  }), {
    status: 200, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}
