import { describe, it, expect, vi, beforeEach } from "vitest";
import { withRetry, sleep, calculateBackoff } from "./retry";

describe("sleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("resolves after specified time", async () => {
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });

  it("resolves immediately for 0ms", async () => {
    const promise = sleep(0);
    vi.advanceTimersByTime(0);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe("calculateBackoff", () => {
  it("returns at least baseDelayMs", () => {
    const result = calculateBackoff(0, 1000, 30000);
    expect(result).toBeGreaterThanOrEqual(1000);
  });

  it("increases with attempt number", () => {
    const attempt0 = calculateBackoff(0, 1000, 30000);
    const attempt2 = calculateBackoff(2, 1000, 30000);
    expect(attempt2).toBeGreaterThan(attempt0);
  });

  it("does not exceed maxDelayMs", () => {
    const result = calculateBackoff(20, 1000, 30000);
    expect(result).toBeLessThanOrEqual(30000);
  });

  it("adds randomness via Math.random", () => {
    const results = new Set<number>();
    for (let i = 0; i < 20; i++) {
      results.add(calculateBackoff(1, 1000, 30000));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockResolvedValue("success");
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries multiple times before succeeding", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockRejectedValueOnce(new Error("fail 3"))
      .mockResolvedValue("success");
    const result = await withRetry(fn, { maxRetries: 5, baseDelayMs: 10, maxDelayMs: 100 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("throws after max retries exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fail"));
    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 })
    ).rejects.toThrow("always fail");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("handles non-Error throws", async () => {
    const fn = vi.fn().mockRejectedValue("string error");
    await expect(
      withRetry(fn, { maxRetries: 1, baseDelayMs: 10, maxDelayMs: 100 })
    ).rejects.toThrow("string error");
  });

  it("uses default config when none provided", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
  });

  it("merges partial config with defaults", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { maxRetries: 1 });
    expect(result).toBe("ok");
  });
});
