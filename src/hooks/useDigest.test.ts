import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDigest } from "./useDigest";

describe("useDigest", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => useDigest());
    expect(result.current.digest).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("generateDigest is a function", () => {
    const { result } = renderHook(() => useDigest());
    expect(typeof result.current.generateDigest).toBe("function");
  });

  it("generates digest successfully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        date: "2024-01-15",
        summary: "Test",
        metrics: { orders: 5, revenue: 500, profit: 200, stockAlerts: 0, supplierDelays: 0 },
        alerts: [],
        recommendations: [],
        weeklyTrend: { direction: "up", percentage: 10, insight: "Growing" },
      }),
    }));
    const { result } = renderHook(() => useDigest());
    await act(async () => {
      await result.current.generateDigest("2024-01-15");
    });
    expect(result.current.digest).not.toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("handles error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
    }));
    const { result } = renderHook(() => useDigest());
    await act(async () => {
      await result.current.generateDigest();
    });
    expect(result.current.error).toBeTruthy();
  });
});
