import { rateLimit, rateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

interface FeedbackEntry {
  rating: number;
  confused: string;
  wouldUseAgain: boolean;
  requestedFeature: string;
  wallet?: string;
  timestamp: string;
}

const feedbackEntries: FeedbackEntry[] = [];

export async function GET(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.api, "feedback");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  const ratings = feedbackEntries.map((e) => e.rating);
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "0";
  const wouldUseAgain = feedbackEntries.filter((e) => e.wouldUseAgain).length;

  const featureCounts = new Map<string, number>();
  for (const e of feedbackEntries) {
    if (e.requestedFeature) {
      featureCounts.set(e.requestedFeature, (featureCounts.get(e.requestedFeature) ?? 0) + 1);
    }
  }
  const topFeatures = Array.from(featureCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([feature, count]) => ({ feature, count }));

    return new Response(JSON.stringify({
      total: feedbackEntries.length,
      averageRating: feedbackEntries.length > 0 ? (feedbackEntries.reduce((s, e) => s + e.rating, 0) / feedbackEntries.length).toFixed(1) : "0",
      wouldUseAgain: feedbackEntries.filter(e => e.wouldUseAgain).length,
      topFeatures: topFeatures.slice(0, 5),
    }), {
    status: 200, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}

export async function POST(request: Request) {
  const limitResult = rateLimit(request, RATE_LIMITS.wallet, "feedback_write");
  if (!limitResult.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
    });
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const rating = parseInt(String(body.rating ?? "0"), 10);
  if (rating < 1 || rating > 5 || isNaN(rating)) {
    return new Response(JSON.stringify({ error: "Rating must be 1-5" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const entry: FeedbackEntry = {
    rating,
    confused: String(body.confused ?? "").slice(0, 500),
    wouldUseAgain: body.wouldUseAgain === true || body.wouldUseAgain === "true",
    requestedFeature: String(body.requestedFeature ?? "").slice(0, 200),
    wallet: String(body.wallet ?? "").slice(0, 56),
    timestamp: new Date().toISOString(),
  };

  feedbackEntries.push(entry);

  return new Response(JSON.stringify({
    success: true,
    entry,
    total: feedbackEntries.length,
  }), {
    status: 200, headers: { "Content-Type": "application/json", ...rateLimitHeaders(limitResult) },
  });
}
