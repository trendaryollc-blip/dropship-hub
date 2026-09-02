import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimitByUser, rateLimitGlobal, LIMITS } from "./rate-limit";

function createMockRequest(pathname = "/api/test") {
  return {
    nextUrl: { pathname },
  } as any;
}

let counter = 0;

describe("rateLimitByUser", () => {
  beforeEach(() => {
    counter++;
  });

  it("allows first request", () => {
    const result = rateLimitByUser(createMockRequest(), `u1-${counter}`, { windowMs: 60000, maxRequests: 5 });
    expect(result.allowed).toBe(true);
    expect(result.response).toBeUndefined();
  });

  it("allows requests up to maxRequests", () => {
    const config = { windowMs: 60000, maxRequests: 3 };
    const uid = `u2-${counter}`;
    expect(rateLimitByUser(createMockRequest(), uid, config).allowed).toBe(true);
    expect(rateLimitByUser(createMockRequest(), uid, config).allowed).toBe(true);
    expect(rateLimitByUser(createMockRequest(), uid, config).allowed).toBe(true);
    const result = rateLimitByUser(createMockRequest(), uid, config);
    expect(result.allowed).toBe(false);
    expect(result.response).toBeDefined();
  });

  it("isolates users", () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    rateLimitByUser(createMockRequest(), `u3a-${counter}`, config);
    const result = rateLimitByUser(createMockRequest(), `u3b-${counter}`, config);
    expect(result.allowed).toBe(true);
  });

  it("isolates routes", () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    rateLimitByUser(createMockRequest("/api/a"), `u4-${counter}`, config);
    const result = rateLimitByUser(createMockRequest("/api/b"), `u4-${counter}`, config);
    expect(result.allowed).toBe(true);
  });

  it("returns 429 status when blocked", () => {
    const config = { windowMs: 60000, maxRequests: 1 };
    const uid = `u5-${counter}`;
    rateLimitByUser(createMockRequest(), uid, config);
    const result = rateLimitByUser(createMockRequest(), uid, config);
    expect(result.allowed).toBe(false);
    expect(result.response).toBeDefined();
  });
});

describe("rateLimitGlobal", () => {
  beforeEach(() => {
    counter++;
  });

  it("allows requests within limit", () => {
    const config = { windowMs: 60000, maxRequests: 2 };
    expect(rateLimitGlobal(createMockRequest(`/gl-${counter}`), config).allowed).toBe(true);
    expect(rateLimitGlobal(createMockRequest(`/gl-${counter}`), config).allowed).toBe(true);
    expect(rateLimitGlobal(createMockRequest(`/gl-${counter}`), config).allowed).toBe(false);
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
});
