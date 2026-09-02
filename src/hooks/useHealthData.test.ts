import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockUser = { uid: "user-123" };

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}));

vi.mock("@/lib/data", () => ({
  getSearchHistory: vi.fn(),
  getCalcHistory: vi.fn(),
  getCompetitorSearches: vi.fn(),
  getCostProfiles: vi.fn(),
  getStoreConnections: vi.fn(),
  getRevenueEntries: vi.fn(),
  getWatchlist: vi.fn(),
  getFavorites: vi.fn(),
}));

import { useHealthData } from "./useHealthData";
import {
  getSearchHistory,
  getCalcHistory,
  getCompetitorSearches,
  getCostProfiles,
  getStoreConnections,
  getRevenueEntries,
  getWatchlist,
  getFavorites,
} from "@/lib/data";

describe("useHealthData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSearchHistory).mockResolvedValue([{ id: "1" }, { id: "2" }]);
    vi.mocked(getCalcHistory).mockResolvedValue([{ id: "1" }]);
    vi.mocked(getCompetitorSearches).mockResolvedValue([]);
    vi.mocked(getCostProfiles).mockResolvedValue([{ id: "1" }, { id: "2" }, { id: "3" }]);
    vi.mocked(getStoreConnections).mockResolvedValue([{ id: "1" }]);
    vi.mocked(getRevenueEntries).mockResolvedValue([{ id: "1" }, { id: "2" }]);
    vi.mocked(getWatchlist).mockResolvedValue([{ id: "1" }]);
    vi.mocked(getFavorites).mockResolvedValue([{ id: "1" }]);
  });

  it("loads health data on mount with counts", async () => {
    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.searchHistoryCount).toBe(2);
    expect(result.current.calcHistoryCount).toBe(1);
    expect(result.current.competitorSearchCount).toBe(0);
    expect(result.current.costProfileCount).toBe(3);
    expect(result.current.storeConnectionCount).toBe(1);
    expect(result.current.revenueEntryCount).toBe(2);
    expect(result.current.watchlistCount).toBe(1);
    expect(result.current.savedProductCount).toBe(1);
    expect(result.current.supplierFavoriteCount).toBe(1);
  });

  it("returns zero counts when no user", async () => {
    const { useAuth } = await import("@/components/auth/AuthProvider");
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);

    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.searchHistoryCount).toBe(0);
    expect(result.current.loading).toBe(false);

    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as never);
  });

  it("handles rejected promises gracefully", async () => {
    vi.mocked(getSearchHistory).mockRejectedValue(new Error("fail"));
    vi.mocked(getCalcHistory).mockResolvedValue([{ id: "1" }]);

    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.searchHistoryCount).toBe(0);
    expect(result.current.calcHistoryCount).toBe(1);
  });

  it("refresh re-fetches data", async () => {
    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(getSearchHistory).mockResolvedValue([{ id: "1" }, { id: "2" }, { id: "3" }]);

    await result.current.refresh();

    await waitFor(() => expect(result.current.searchHistoryCount).toBe(3));
  });
});
