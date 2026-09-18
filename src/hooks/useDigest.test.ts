import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// useDigest was rewritten to use SWR-backed useAPI hooks plus safeFetch for
// mutations, and its public API is now:
//   { currentDigest, history, historyChart, generating, isLoading,
//     preferences, selectedDate, setSelectedDate, generateDigest, ... }
// These tests mock the hook's collaborators to match that implementation.
const { mutateMock, safeFetchMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  safeFetchMock: vi.fn(),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn((url: string | null) => ({
    data: url === "/api/digest" ? { digests: [] } : undefined,
    isLoading: false,
    mutate: mutateMock,
  })),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: (...args: unknown[]) => safeFetchMock(...args),
}));

import { useDigest } from "./useDigest";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useDigest", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() => useDigest());
    expect(result.current.currentDigest).toBeNull();
    expect(result.current.history).toEqual([]);
    expect(result.current.historyChart).toEqual([]);
    expect(result.current.generating).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.selectedDate).toBeNull();
  });

  it("exposes action functions", () => {
    const { result } = renderHook(() => useDigest());
    expect(typeof result.current.generateDigest).toBe("function");
    expect(typeof result.current.deleteDigest).toBe("function");
    expect(typeof result.current.updatePreferences).toBe("function");
    expect(typeof result.current.setSelectedDate).toBe("function");
  });

  it("generates digest successfully", async () => {
    safeFetchMock.mockResolvedValueOnce({
      date: "2024-01-15",
      summary: "Test",
      metrics: { orders: 5, revenue: 500, profit: 200, stockAlerts: 0, supplierDelays: 0 },
      alerts: [],
      recommendations: [],
      weeklyTrend: { direction: "up", percentage: 10, insight: "Growing" },
    });

    const { result } = renderHook(() => useDigest());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.generateDigest({ date: "2024-01-15" });
    });

    expect(returned).not.toBeNull();
    expect(safeFetchMock).toHaveBeenCalledWith(
      "/api/digest",
      expect.objectContaining({ method: "POST" })
    );
    expect(mutateMock).toHaveBeenCalled();
    expect(result.current.generating).toBe(false);
  });

  it("handles error when generating", async () => {
    safeFetchMock.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useDigest());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.generateDigest();
    });

    expect(returned).toBeNull();
    expect(result.current.generating).toBe(false);
  });

  it("deletes a digest successfully", async () => {
    safeFetchMock.mockResolvedValueOnce({});

    const { result } = renderHook(() => useDigest());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.deleteDigest("2024-01-15");
    });

    expect(returned).toBe(true);
    expect(safeFetchMock).toHaveBeenCalledWith(
      "/api/digest?date=2024-01-15",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(mutateMock).toHaveBeenCalled();
  });

  it("returns false when delete fails", async () => {
    safeFetchMock.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() => useDigest());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.deleteDigest("2024-01-15");
    });

    expect(returned).toBe(false);
  });

  it("updates preferences successfully", async () => {
    safeFetchMock.mockResolvedValueOnce({});

    const { result } = renderHook(() => useDigest());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.updatePreferences({ emailEnabled: true });
    });

    expect(returned).toBe(true);
    expect(safeFetchMock).toHaveBeenCalledWith(
      "/api/digest/preferences",
      expect.objectContaining({ method: "POST" })
    );
  });
});
