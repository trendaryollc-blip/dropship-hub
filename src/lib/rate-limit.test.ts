import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  rateLimitByUser,
  rateLimitGlobal,
  rateLimitByKey,
  getRateLimitStatus,
  getTierLimits,
  LIMITS,
  type UserTier,
} from "./rate-limit";

function createMockRequest(pathname = "/api/test") {
  return {
    nextUrl: { pathname },
  } as any;
}

describe("rateLimitByUser", () => {
  it("allows first request", async () => {
    const result = await rateLimitByUser(createMockRequest(), "user1", { windowMs: 60000, maxRequests: 5 });
    expect(result.allowed).toBe(true);
    expect(result.response).toBeUndefined();
  });

  it("allows requests up to maxRequests", async () => {
    const config = { windowMs: 60000, maxRequests: 3 };
    const uid = "user-limit-test";
    expect((await rateLimitByUser(createMockRequest(), uid, config)).allowed).toBe(true);
    expect((await rateLimitByUser(createMockRequest(), uid, config)).allowed).toBe(true);
    expect((await rateLimitByUser(createMockRequest(), uid, config)).allowed).toBe(true);
    const result = await rateLimitByUser(createMockRequest(), uid, config);
    expect(result.allowed).toBe(false);
    expect(result.response).toBeDefined();
  });

  it("isolates users", async () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    await rateLimitByUser(createMockRequest(), "user-a-isolation", config);
    const result = await rateLimitByUser(createMockRequest(), "user-b-isolation", config);
    expect(result.allowed).toBe(true);
  });

  it("isolates routes", async () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    await rateLimitByUser(createMockRequest("/api/a"), "user-route-test", config);
    const result = await rateLimitByUser(createMockRequest("/api/b"), "user-route-test", config);
    expect(result.allowed).toBe(true);
  });

  it("returns 429 status when blocked", async () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    await rateLimitByUser(createMockRequest(), "user-429-test", config);
    const result = await rateLimitByUser(createMockRequest(), "user-429-test", config);
    expect(result.allowed).toBe(false);
    expect(result.response).toBeDefined();
  });

  it("applies tier-specific limits for pro users", async () => {
    const config = { windowMs: 60000, maxRequests: 30 };
    const result = await rateLimitByUser(createMockRequest(), "user-pro-tier-test", config, "pro");
    expect(result.allowed).toBe(true);
  });

  it("applies tier-specific limits for enterprise users", async () => {
    const config = { windowMs: 60000, maxRequests: 30 };
    const result = await rateLimitByUser(createMockRequest(), "user-enterprise-tier-test", config, "enterprise");
    expect(result.allowed).toBe(true);
  });

  it("defaults to free tier when no tier specified", async () => {
    const config = { windowMs: 60000, maxRequests: 30 };
    const result = await rateLimitByUser(createMockRequest(), "user-default-tier-test", config);
    expect(result.allowed).toBe(true);
  });
});

describe("rateLimitGlobal", () => {
  it("allows requests within limit", async () => {
    const config = { windowMs: 60000, maxRequests: 2 };
    expect((await rateLimitGlobal(createMockRequest("/gl-1"), config)).allowed).toBe(true);
    expect((await rateLimitGlobal(createMockRequest("/gl-1"), config)).allowed).toBe(true);
    expect((await rateLimitGlobal(createMockRequest("/gl-1"), config)).allowed).toBe(false);
  });
});

describe("rateLimitByKey", () => {
  it("allows requests within limit", async () => {
    const config = { windowMs: 60000, maxRequests: 2 };
    expect((await rateLimitByKey("key-1", config)).allowed).toBe(true);
    expect((await rateLimitByKey("key-1", config)).allowed).toBe(true);
    expect((await rateLimitByKey("key-1", config)).allowed).toBe(false);
  });

  it("isolates different keys", async () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    await rateLimitByKey("key-a", config);
    const result = await rateLimitByKey("key-b", config);
    expect(result.allowed).toBe(true);
  });

  it("returns remaining count", async () => {
    const config = { windowMs: 60000, maxRequests: 5 };
    const result = await rateLimitByKey("key-remaining", config);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result.remaining).toBeLessThanOrEqual(4);
  });

  it("returns reset time", async () => {
    const config = { windowMs: 60000, maxRequests: 5 };
    const result = await rateLimitByKey("key-reset", config);
    expect(result.resetTime).toBeGreaterThan(Date.now());
  });
});

describe("getRateLimitStatus", () => {
  it("returns status for unknown key", async () => {
    const config = { windowMs: 60000, maxRequests: 10 };
    const status = await getRateLimitStatus("unknown-key-status", config);
    expect(status.remaining).toBe(10);
    expect(status.limit).toBe(10);
    expect(status.resetTime).toBeGreaterThan(Date.now());
  });

  it("returns status after requests", async () => {
    const config = { windowMs: 60000, maxRequests: 10 };
    await rateLimitByKey("status-test-key", config);
    await rateLimitByKey("status-test-key", config);
    const status = await getRateLimitStatus("status-test-key", config);
    expect(status.remaining).toBeLessThan(10);
    expect(status.limit).toBe(10);
  });
});

describe("getTierLimits", () => {
  it("returns correct limits for free tier", () => {
    const limits = getTierLimits("free");
    expect(limits.DEFAULT.maxRequests).toBe(60);
    expect(limits.AI_CHAT.maxRequests).toBe(30);
    expect(limits.PLATFORM_SEARCH.maxRequests).toBe(10);
    expect(limits.AUTH.maxRequests).toBe(10);
  });

  it("returns correct limits for pro tier", () => {
    const limits = getTierLimits("pro");
    expect(limits.DEFAULT.maxRequests).toBe(120);
    expect(limits.AI_CHAT.maxRequests).toBe(60);
    expect(limits.PLATFORM_SEARCH.maxRequests).toBe(25);
    expect(limits.AUTH.maxRequests).toBe(20);
    expect(limits.WEBHOOK_OUTGOING).toBeDefined();
    expect(limits.API_EXTERNAL).toBeDefined();
  });

  it("returns correct limits for enterprise tier", () => {
    const limits = getTierLimits("enterprise");
    expect(limits.DEFAULT.maxRequests).toBe(300);
    expect(limits.AI_CHAT.maxRequests).toBe(150);
    expect(limits.PLATFORM_SEARCH.maxRequests).toBe(50);
    expect(limits.AUTH.maxRequests).toBe(30);
    expect(limits.WEBHOOK_OUTGOING.maxRequests).toBe(200);
    expect(limits.API_EXTERNAL.maxRequests).toBe(100);
  });

  it("has WEBHOOK_OUTGOING in pro and enterprise tiers", () => {
    const proLimits = getTierLimits("pro");
    const enterpriseLimits = getTierLimits("enterprise");
    expect(proLimits.WEBHOOK_OUTGOING).toBeDefined();
    expect(enterpriseLimits.WEBHOOK_OUTGOING).toBeDefined();
  });

  it("has API_EXTERNAL in pro and enterprise tiers", () => {
    const proLimits = getTierLimits("pro");
    const enterpriseLimits = getTierLimits("enterprise");
    expect(proLimits.API_EXTERNAL).toBeDefined();
    expect(enterpriseLimits.API_EXTERNAL).toBeDefined();
  });
});

describe("LIMITS", () => {
  it("has correct structure", () => {
    expect(LIMITS.DEFAULT.windowMs).toBe(60000);
    expect(LIMITS.DEFAULT.maxRequests).toBe(60);
    expect(LIMITS.AI_CHAT.windowMs).toBe(60000);
    expect(LIMITS.AI_CHAT.maxRequests).toBe(30);
    expect(LIMITS.PLATFORM_SEARCH.windowMs).toBe(60000);
    expect(LIMITS.PLATFORM_SEARCH.maxRequests).toBe(10);
    expect(LIMITS.AUTH.windowMs).toBe(900000);
    expect(LIMITS.AUTH.maxRequests).toBe(10);
  });

  it("has WEBHOOK_OUTGOING limit", () => {
    expect(LIMITS.WEBHOOK_OUTGOING).toBeDefined();
    expect(LIMITS.WEBHOOK_OUTGOING.windowMs).toBe(60000);
    expect(LIMITS.WEBHOOK_OUTGOING.maxRequests).toBe(50);
  });

  it("has API_EXTERNAL limit", () => {
    expect(LIMITS.API_EXTERNAL).toBeDefined();
    expect(LIMITS.API_EXTERNAL.windowMs).toBe(60000);
    expect(LIMITS.API_EXTERNAL.maxRequests).toBe(30);
  });

  it("has all required limits", () => {
    expect(LIMITS.DEFAULT).toBeDefined();
    expect(LIMITS.AI_CHAT).toBeDefined();
    expect(LIMITS.PLATFORM_SEARCH).toBeDefined();
    expect(LIMITS.PRODUCT_ENRICH).toBeDefined();
    expect(LIMITS.STORE_PUSH).toBeDefined();
    expect(LIMITS.FULFILLMENT).toBeDefined();
    expect(LIMITS.RETURNS).toBeDefined();
    expect(LIMITS.AUTH).toBeDefined();
  });
});
