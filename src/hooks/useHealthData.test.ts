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
    vi.mocked(getSearchHistory).mockResolvedValue([{ id: "1", query: "test", source: "manual", createdAt: "2024-01-01" }, { id: "2", query: "test2", source: "manual", createdAt: "2024-01-02" }] as never);
    vi.mocked(getCalcHistory).mockResolvedValue([{ id: "1", type: "profit", inputs: {}, result: {}, savedAt: new Date() }] as never);
    vi.mocked(getCompetitorSearches).mockResolvedValue([]);
    vi.mocked(getCostProfiles).mockResolvedValue([{ id: "1", productId: "P1", productTitle: "Product", cogs: 10, shippingCost: 5, platformFee: 2, packagingCost: 1, otherCosts: 0.5, totalCOGS: 18.5, effectiveDate: "2024-01-01", isActive: true, priceHistory: [], createdAt: "2024-01-01", updatedAt: "2024-01-01" }, { id: "2", productId: "P2", productTitle: "Product 2", cogs: 15, shippingCost: 5, platformFee: 3, packagingCost: 1, otherCosts: 0.5, totalCOGS: 24.5, effectiveDate: "2024-01-01", isActive: true, priceHistory: [], createdAt: "2024-01-01", updatedAt: "2024-01-01" }, { id: "3", productId: "P3", productTitle: "Product 3", cogs: 20, shippingCost: 5, platformFee: 4, packagingCost: 1, otherCosts: 0.5, totalCOGS: 30.5, effectiveDate: "2024-01-01", isActive: true, priceHistory: [], createdAt: "2024-01-01", updatedAt: "2024-01-01" }] as never);
    vi.mocked(getStoreConnections).mockResolvedValue([{ id: "1", platform: "shopify", name: "Store", url: "https://store.com", status: "connected", connectedAt: "2024-01-01" }] as never);
    vi.mocked(getRevenueEntries).mockResolvedValue([{ id: "1", date: "2024-01-01", amount: 100, orders: 5, createdAt: "2024-01-01" }, { id: "2", date: "2024-01-02", amount: 200, orders: 10, createdAt: "2024-01-02" }] as never);
    vi.mocked(getWatchlist).mockResolvedValue([{ id: "1", type: "product", title: "Watched", itemId: "W1", addedAt: "2024-01-01" }] as never);
    vi.mocked(getFavorites).mockResolvedValue([{ id: "1", type: "product", title: "Fav", itemId: "F1", addedAt: "2024-01-01" }] as never);
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
    vi.mocked(getCalcHistory).mockResolvedValue([{ id: "1", type: "profit", inputs: {}, result: {}, savedAt: new Date() }] as never);

    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.searchHistoryCount).toBe(0);
    expect(result.current.calcHistoryCount).toBe(1);
  });

  it("refresh re-fetches data", async () => {
    const { result } = renderHook(() => useHealthData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(getSearchHistory).mockResolvedValue([{ id: "1", query: "test", source: "manual", createdAt: "2024-01-01" }, { id: "2", query: "test2", source: "manual", createdAt: "2024-01-02" }, { id: "3", query: "test3", source: "manual", createdAt: "2024-01-03" }] as never);

    await result.current.refresh();

    await waitFor(() => expect(result.current.searchHistoryCount).toBe(3));
  });
});
