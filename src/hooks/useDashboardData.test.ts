import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(() => ({
    data: undefined,
    isLoading: true,
    mutate: vi.fn(),
  })),
}));

import { useDashboardData } from "./useDashboardData";
import { useAPI } from "@/hooks/useAPI";

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns defaults when no data", () => {
    vi.mocked(useAPI).mockReturnValue({
      data: undefined,
      isLoading: true,
      mutate: vi.fn(),
    } as never);

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.loading).toBe(true);
    expect(result.current.data.ticker).toEqual([]);
    expect(result.current.data.dailyPick).toBeNull();
    expect(result.current.data.alerts).toEqual([]);
    expect(result.current.data.niches).toEqual([]);
    expect(result.current.data.suppliers).toEqual([]);
    expect(result.current.data.heatmap).toEqual([]);
    expect(result.current.data.trending).toEqual([]);
    expect(result.current.data.compareItems).toEqual([]);
  });

  it("uses API data when available", () => {
    const mockData = {
      ticker: [{ label: "BTC", value: "60000", change: "+2%", up: true }],
      alerts: [{ id: "1", title: "Alert", read: false }],
      nicheCards: [{ id: "1", name: "Niche" }],
      supplierStatuses: [{ id: "1", name: "Supplier" }],
      heatmap: [{ category: "Tech", count: 5 }],
      trending: [{ id: "1", title: "Trending" }],
      revenueStats: { revenue: 1000, growth: 10, orders: 50, avgOrder: 20 },
      briefing: { insights: ["test"], sentiment: 70, sentimentLabel: "Positive", opportunities: 3, risks: 1, trends: 5, lastScan: "2026-01-01" },
      pulse: [{ label: "Market", value: "Up", change: "+1%", up: true, sparkline: [1, 2, 3], icon: "trend", color: "green" }],
      actionStats: [{ label: "Search", description: "Search products", href: "/search", color: "blue", stat: "100", statLabel: "queries" }],
    };

    vi.mocked(useAPI).mockReturnValue({
      data: mockData,
      isLoading: false,
      mutate: vi.fn(),
    } as never);

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.loading).toBe(false);
    expect(result.current.data.ticker).toEqual(mockData.ticker);
    expect(result.current.data.alerts).toEqual(mockData.alerts);
    expect(result.current.data.briefing).toEqual(mockData.briefing);
  });

  it("addToCompare adds items up to 4", () => {
    vi.mocked(useAPI).mockReturnValue({
      data: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as never);

    const { result } = renderHook(() => useDashboardData());

    const item = { name: "Widget", price: 10, margin: 5, image: "img.png" };

    act(() => result.current.addToCompare(item));
    expect(result.current.data.compareItems).toHaveLength(1);

    act(() => result.current.addToCompare(item));
    expect(result.current.data.compareItems).toHaveLength(1);

    act(() => result.current.addToCompare({ ...item, name: "Widget2" }));
    act(() => result.current.addToCompare({ ...item, name: "Widget3" }));
    act(() => result.current.addToCompare({ ...item, name: "Widget4" }));
    act(() => result.current.addToCompare({ ...item, name: "Widget5" }));
    expect(result.current.data.compareItems).toHaveLength(4);
  });

  it("removeFromCompare removes items by name", () => {
    vi.mocked(useAPI).mockReturnValue({
      data: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as never);

    const { result } = renderHook(() => useDashboardData());

    act(() => result.current.addToCompare({ name: "A", price: 1, margin: 1, image: "" }));
    act(() => result.current.addToCompare({ name: "B", price: 2, margin: 2, image: "" }));
    expect(result.current.data.compareItems).toHaveLength(2);

    act(() => result.current.removeFromCompare("A"));
    expect(result.current.data.compareItems).toHaveLength(1);
    expect(result.current.data.compareItems[0].name).toBe("B");
  });

  it("clearCompare empties the list", () => {
    vi.mocked(useAPI).mockReturnValue({
      data: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as never);

    const { result } = renderHook(() => useDashboardData());

    act(() => result.current.addToCompare({ name: "A", price: 1, margin: 1, image: "" }));
    expect(result.current.data.compareItems).toHaveLength(1);

    act(() => result.current.clearCompare());
    expect(result.current.data.compareItems).toHaveLength(0);
  });

  it("markAlertRead marks a single alert as read", () => {
    const mutateFn = vi.fn();
    vi.mocked(useAPI).mockReturnValue({
      data: { alerts: [{ id: "1", read: false }, { id: "2", read: false }] },
      isLoading: false,
      mutate: mutateFn,
    } as never);

    const { result } = renderHook(() => useDashboardData());

    act(() => result.current.markAlertRead("1"));

    expect(mutateFn).toHaveBeenCalled();
    const updater = mutateFn.mock.calls[0][0];
    const prev = { alerts: [{ id: "1", read: false }, { id: "2", read: false }] };
    const updated = updater(prev);
    expect(updated.alerts[0].read).toBe(true);
    expect(updated.alerts[1].read).toBe(false);
  });

  it("markAllAlertsRead marks all alerts as read", () => {
    const mutateFn = vi.fn();
    vi.mocked(useAPI).mockReturnValue({
      data: { alerts: [{ id: "1", read: false }, { id: "2", read: false }] },
      isLoading: false,
      mutate: mutateFn,
    } as never);

    const { result } = renderHook(() => useDashboardData());

    act(() => result.current.markAllAlertsRead());

    const updater = mutateFn.mock.calls[0][0];
    const prev = { alerts: [{ id: "1", read: false }, { id: "2", read: false }] };
    const updated = updater(prev);
    expect(updated.alerts.every((a: { read: boolean }) => a.read)).toBe(true);
  });
});
