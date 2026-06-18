// OWASP-compliant token-bucket rate limiter.
// Tracks IP addresses and enforces per-endpoint rate limits.
// Returns 429 Too Many Requests with Retry-After header when exceeded.

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > 30 * 60 * 1000) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitConfig {
  // Maximum burst of requests allowed
  burst: number;
  // Sustained rate: requests per second
  rate: number;
}

// Sensible defaults for different endpoint categories
export const RATE_LIMITS = {
  // API endpoints — conservative to protect RPC upstream
  api: { burst: 30, rate: 2 } as RateLimitConfig,
  // Wallet operations — per-IP, prevents spamming the chain
  wallet: { burst: 10, rate: 0.5 } as RateLimitConfig,
  // General page loads — very generous
  page: { burst: 300, rate: 10 } as RateLimitConfig,
};

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  limit: number;
  remaining: number;
  reset: number;
}

// OWASP: Extract client IP, respecting X-Forwarded-For with sanitization
function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // OWASP: sanitize — take only the first (leftmost) IP, reject IPs with suspicious chars
    const first = forwarded.split(",")[0]?.trim();
    if (first && /^[\d.:a-fA-F]+$/.test(first)) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp && /^[\d.:a-fA-F]+$/.test(realIp)) return realIp;
  // fallback: a hash of user-agent + accept-language is weak but avoids treating
  // all requests behind a proxy as the same client
  const ua = request.headers.get("user-agent") ?? "unknown";
  const accept = request.headers.get("accept-language") ?? "unknown";
  return `anon:${simpleHash(ua + accept)}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash).toString(16);
}

// OWASP: Token bucket algorithm with wall-clock refill
export function rateLimit(
  request: Request,
  config: RateLimitConfig,
  endpoint: string = "default",
): RateLimitResult {
  cleanup();

  const ip = getClientIP(request);
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.burst, lastRefill: now };
    buckets.set(key, bucket);
  }

  // OWASP: refill tokens based on elapsed time (token bucket algorithm)
  const elapsedMs = now - bucket.lastRefill;
  const refillAmount = (elapsedMs / 1000) * config.rate;
  bucket.tokens = Math.min(config.burst, bucket.tokens + refillAmount);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const waitMs = Math.ceil(((1 - bucket.tokens) / config.rate) * 1000);
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil(waitMs / 1000)),
      limit: config.burst,
      remaining: 0,
      reset: now + waitMs,
    };
  }

  bucket.tokens -= 1;

  return {
    allowed: true,
    limit: config.burst,
    remaining: Math.floor(bucket.tokens),
    reset: now + Math.ceil((config.burst - bucket.tokens) / config.rate) * 1000,
  };
}

// OWASP: Rate limit response headers (RateLimit header fields per IETF draft)
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
    ...(result.retryAfter !== undefined
      ? { "Retry-After": String(result.retryAfter) }
      : {}),
  };
}
