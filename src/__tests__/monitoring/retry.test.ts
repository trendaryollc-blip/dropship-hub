import { describe, it, expect, vi, beforeEach } from "vitest";
import { withRetry, sleep, calculateBackoff } from "@/lib/monitoring/retry";

describe("retry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("withRetry", () => {
    it("returns result on first success", async () => {
      const fn = vi.fn().mockResolvedValue("ok");
      const result = await withRetry(fn);
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on failure and succeeds", async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error("fail 1"))
        .mockResolvedValue("ok");
      const result = await withRetry(fn, { baseDelayMs: 10, maxRetries: 2 });
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("throws after max retries exhausted", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("always fail"));
      await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow("always fail");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("respects custom retry config", async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValue("ok");
      const result = await withRetry(fn, { maxRetries: 5, baseDelayMs: 5, maxDelayMs: 50 });
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("handles non-Error throws", async () => {
      const fn = vi.fn().mockRejectedValue("string error");
      await expect(withRetry(fn, { maxRetries: 1, baseDelayMs: 10 })).rejects.toThrow("string error");
    });

    it("passes through the function call correctly", async () => {
      const fn = vi.fn().mockResolvedValue(42);
      const result = await withRetry(fn);
      expect(result).toBe(42);
      expect(fn).toHaveBeenCalledWith();
    });
  });

  describe("sleep", () => {
    it("resolves after specified time", async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  describe("calculateBackoff", () => {
    it("returns base delay for first attempt", () => {
      const delay = calculateBackoff(0, 1000, 30000);
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(2000);
    });

    it("doubles delay with each attempt", () => {
      const d0 = calculateBackoff(0, 1000, 30000);
      const d1 = calculateBackoff(1, 1000, 30000);
      const d2 = calculateBackoff(2, 1000, 30000);
      expect(d1).toBeGreaterThan(d0);
      expect(d2).toBeGreaterThan(d1);
    });

    it("caps at maxDelayMs", () => {
      const delay = calculateBackoff(20, 1000, 30000);
      expect(delay).toBeLessThanOrEqual(30000 + 1000);
    });
  });
});
