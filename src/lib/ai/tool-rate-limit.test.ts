import { describe, it, expect, vi, beforeEach } from "vitest";
import { enforceToolRateLimit, enforceSearchDailyLimit } from "./tool-rate-limit";

const { mockRateLimitByKey, mockGetUserTier } = vi.hoisted(() => ({
  mockRateLimitByKey: vi.fn(),
  mockGetUserTier: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return { ...actual, rateLimitByKey: mockRateLimitByKey };
});

vi.mock("@/lib/auth", () => ({
  getUserTier: mockGetUserTier,
}));

describe("tool-rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserTier.mockResolvedValue("free");
    mockRateLimitByKey.mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetTime: Date.now() + 60_000,
    });
  });

  describe("enforceToolRateLimit", () => {
    it("allows and consumes the per-tool minute and daily budgets", async () => {
      const decision = await enforceToolRateLimit("u1", "search_suppliers");

      expect(decision).toEqual({ allowed: true });
      expect(mockRateLimitByKey).toHaveBeenNthCalledWith(1, "tool:u1:search_suppliers", {
        windowMs: 60_000,
        maxRequests: 60,
      });
      expect(mockRateLimitByKey).toHaveBeenNthCalledWith(2, "ai_daily:u1", {
        windowMs: 86_400_000,
        maxRequests: 50,
      });
    });

    it("blocks when the per-tool minute limit is exceeded", async () => {
      mockRateLimitByKey.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30_000,
      });

      const decision = await enforceToolRateLimit("u1", "search_suppliers");

      expect(decision.allowed).toBe(false);
      if (!decision.allowed) {
        expect(decision.error).toContain("Rate limit exceeded for search_suppliers");
        expect(decision.error).toContain("60 calls per minute");
      }
      expect(mockRateLimitByKey).toHaveBeenCalledTimes(1);
    });

    it("blocks when the daily AI budget is exhausted", async () => {
      mockRateLimitByKey
        .mockResolvedValueOnce({ allowed: true, remaining: 1, resetTime: Date.now() + 60_000 })
        .mockResolvedValueOnce({ allowed: false, remaining: 0, resetTime: Date.now() + 3_600_000 });

      const decision = await enforceToolRateLimit("u1", "calculate_profit");

      expect(decision.allowed).toBe(false);
      if (!decision.allowed) {
        expect(decision.error).toContain("Daily AI limit reached");
        expect(decision.error).toContain("50 calls per day");
        expect(decision.error).toContain("free tier");
      }
    });

    it("uses the pro tier minute budget", async () => {
      mockGetUserTier.mockResolvedValue("pro");

      const decision = await enforceToolRateLimit("u1", "search_suppliers");

      expect(decision).toEqual({ allowed: true });
      expect(mockRateLimitByKey).toHaveBeenNthCalledWith(1, "tool:u1:search_suppliers", {
        windowMs: 60_000,
        maxRequests: 120,
      });
    });

    it("skips the daily budget for the enterprise tier", async () => {
      mockGetUserTier.mockResolvedValue("enterprise");

      const decision = await enforceToolRateLimit("u1", "search_suppliers");

      expect(decision).toEqual({ allowed: true });
      expect(mockRateLimitByKey).toHaveBeenCalledTimes(1);
      expect(mockRateLimitByKey).toHaveBeenNthCalledWith(1, "tool:u1:search_suppliers", {
        windowMs: 60_000,
        maxRequests: 300,
      });
    });
  });

  describe("enforceSearchDailyLimit", () => {
    it("consumes one daily platform-search token", async () => {
      const decision = await enforceSearchDailyLimit("u1");

      expect(decision).toEqual({ allowed: true });
      expect(mockRateLimitByKey).toHaveBeenCalledWith("search_daily:u1", {
        windowMs: 86_400_000,
        maxRequests: 20,
      });
    });

    it("blocks when the daily search budget is exhausted", async () => {
      mockRateLimitByKey.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 7_200_000,
      });

      const decision = await enforceSearchDailyLimit("u1");

      expect(decision.allowed).toBe(false);
      if (!decision.allowed) {
        expect(decision.error).toContain("Daily platform-search limit reached");
        expect(decision.error).toContain("20 searches per day");
      }
    });

    it("uses the pro tier search budget", async () => {
      mockGetUserTier.mockResolvedValue("pro");

      const decision = await enforceSearchDailyLimit("u1");

      expect(decision).toEqual({ allowed: true });
      expect(mockRateLimitByKey).toHaveBeenCalledWith("search_daily:u1", {
        windowMs: 86_400_000,
        maxRequests: 500,
      });
    });

    it("is unlimited for the enterprise tier", async () => {
      mockGetUserTier.mockResolvedValue("enterprise");

      const decision = await enforceSearchDailyLimit("u1");

      expect(decision).toEqual({ allowed: true });
      expect(mockRateLimitByKey).not.toHaveBeenCalled();
    });
  });
});
