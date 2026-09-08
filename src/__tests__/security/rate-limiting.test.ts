import { describe, it, expect } from "vitest";
import { rateLimitByUser, rateLimitGlobal, LIMITS } from "@/lib/rate-limit";

function createMockRequest(pathname = "/api/test") {
  return { nextUrl: { pathname } } as any;
}

describe("Rate Limiting Security Tests", () => {
  it("enforces per-user rate limits", async () => {
    const config = { windowMs: 60000, maxRequests: 3 };
    expect((await rateLimitByUser(createMockRequest(), "user-a-rl", config)).allowed).toBe(true);
    expect((await rateLimitByUser(createMockRequest(), "user-a-rl", config)).allowed).toBe(true);
    expect((await rateLimitByUser(createMockRequest(), "user-a-rl", config)).allowed).toBe(true);
    expect((await rateLimitByUser(createMockRequest(), "user-a-rl", config)).allowed).toBe(false);
  });

  it("isolates rate limits between users", async () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    await rateLimitByUser(createMockRequest(), "user-x-rl", config);
    expect((await rateLimitByUser(createMockRequest(), "user-y-rl", config)).allowed).toBe(true);
  });

  it("isolates rate limits between routes", async () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    await rateLimitByUser(createMockRequest("/api/a"), "user-z-rl", config);
    expect((await rateLimitByUser(createMockRequest("/api/b"), "user-z-rl", config)).allowed).toBe(true);
  });

  it("global rate limiter works", async () => {
    const config = { windowMs: 60000, maxRequests: 2 };
    expect((await rateLimitGlobal(createMockRequest("/gl-sec-1"), config)).allowed).toBe(true);
    expect((await rateLimitGlobal(createMockRequest("/gl-sec-1"), config)).allowed).toBe(true);
    expect((await rateLimitGlobal(createMockRequest("/gl-sec-1"), config)).allowed).toBe(false);
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

  it("returns 429 response when rate limited", async () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    await rateLimitByUser(createMockRequest("/api/limited"), "rate-user-rl", config);
    const result = await rateLimitByUser(createMockRequest("/api/limited"), "rate-user-rl", config);
    expect(result.allowed).toBe(false);
    expect(result.response).toBeDefined();
  });
});
