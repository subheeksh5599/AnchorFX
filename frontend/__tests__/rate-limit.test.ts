import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Request for rate limiter tests
class MockRequest {
  headers: Map<string, string>;
  constructor(headers: Record<string, string> = {}) {
    this.headers = new Map(Object.entries(headers));
  }
  get headerGet() {
    return (name: string) => this.headers.get(name) ?? null;
  }
}

// Dynamic import to isolate module-level state
describe("rateLimit", () => {
  let rateLimit: typeof import("@/lib/rate-limit").rateLimit;
  let RATE_LIMITS: typeof import("@/lib/rate-limit").RATE_LIMITS;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/lib/rate-limit");
    rateLimit = mod.rateLimit;
    RATE_LIMITS = mod.RATE_LIMITS;
  });

  it("allows requests within burst limit", () => {
    const req = { headers: new Map([["x-forwarded-for", "10.0.0.1"]]) } as unknown as Request;
    for (let i = 0; i < RATE_LIMITS.api.burst; i++) {
      const r = rateLimit(req, RATE_LIMITS.api, "test");
      expect(r.allowed).toBe(true);
    }
  });

  it("blocks requests exceeding burst limit", () => {
    const req = { headers: new Map([["x-forwarded-for", "10.0.0.2"]]) } as unknown as Request;
    for (let i = 0; i < RATE_LIMITS.api.burst; i++) {
      rateLimit(req, RATE_LIMITS.api, "test");
    }
    const r = rateLimit(req, RATE_LIMITS.api, "test");
    expect(r.allowed).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
  });

  it("uses X-Forwarded-For header for client IP", () => {
    const req = { headers: new Map([["x-forwarded-for", "192.168.1.100"]]) } as unknown as Request;
    const r = rateLimit(req, RATE_LIMITS.api, "test");
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(RATE_LIMITS.api.burst - 1);
  });

  it("isolates rate limits per endpoint", () => {
    const req = { headers: new Map([["x-forwarded-for", "10.0.0.3"]]) } as unknown as Request;
    const r1 = rateLimit(req, RATE_LIMITS.api, "endpoint-a");
    const r2 = rateLimit(req, RATE_LIMITS.wallet, "endpoint-b");
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("isolates rate limits per IP", () => {
    const req1 = { headers: new Map([["x-forwarded-for", "10.0.0.4"]]) } as unknown as Request;
    const req2 = { headers: new Map([["x-forwarded-for", "10.0.0.5"]]) } as unknown as Request;
    rateLimit(req1, RATE_LIMITS.api, "test");
    rateLimit(req1, RATE_LIMITS.api, "test");
    const r = rateLimit(req2, RATE_LIMITS.api, "test");
    expect(r.allowed).toBe(true); // different IP, full burst
  });

  it("falls back to anonymous key when no IP headers present", () => {
    const req = {
      headers: new Map([
        ["user-agent", "test-agent"],
        ["accept-language", "en-US"],
      ]),
    } as unknown as Request;
    const r = rateLimit(req, RATE_LIMITS.api, "test");
    expect(r.allowed).toBe(true);
  });
});
