import { describe, it, expect } from "vitest";
import { rateLimitByUser, rateLimitGlobal, LIMITS } from "@/lib/rate-limit";

function createMockRequest(pathname = "/api/test") {
  return { nextUrl: { pathname } } as any;
}

describe("Rate Limiting Security Tests", () => {
  it("enforces per-user rate limits", () => {
    const config = { windowMs: 60000, maxRequests: 3 };
    expect(rateLimitByUser(createMockRequest(), "user-a", config).allowed).toBe(true);
    expect(rateLimitByUser(createMockRequest(), "user-a", config).allowed).toBe(true);
    expect(rateLimitByUser(createMockRequest(), "user-a", config).allowed).toBe(true);
    expect(rateLimitByUser(createMockRequest(), "user-a", config).allowed).toBe(false);
  });

  it("isolates rate limits between users", () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    rateLimitByUser(createMockRequest(), "user-x", config);
    expect(rateLimitByUser(createMockRequest(), "user-y", config).allowed).toBe(true);
  });

  it("isolates rate limits between routes", () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    rateLimitByUser(createMockRequest("/api/a"), "user-z", config);
    expect(rateLimitByUser(createMockRequest("/api/b"), "user-z", config).allowed).toBe(true);
  });

  it("global rate limiter works", () => {
    const config = { windowMs: 60000, maxRequests: 2 };
    expect(rateLimitGlobal(createMockRequest(), config).allowed).toBe(true);
    expect(rateLimitGlobal(createMockRequest(), config).allowed).toBe(true);
    expect(rateLimitGlobal(createMockRequest(), config).allowed).toBe(false);
  });

  it("AI chat has stricter limits", () => {
    expect(LIMITS.AI_CHAT.maxRequests).toBeLessThan(LIMITS.DEFAULT.maxRequests);
  });

  it("platform search has stricter limits", () => {
    expect(LIMITS.PLATFORM_SEARCH.maxRequests).toBeLessThan(LIMITS.DEFAULT.maxRequests);
  });

  it("auth has longer window", () => {
    expect(LIMITS.AUTH.windowMs).toBeGreaterThan(LIMITS.DEFAULT.windowMs);
  });

  it("returns 429 response when rate limited", () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    rateLimitByUser(createMockRequest("/api/limited"), "rate-user", config);
    const result = rateLimitByUser(createMockRequest("/api/limited"), "rate-user", config);
    expect(result.allowed).toBe(false);
    expect(result.response).toBeDefined();
  });
});
