import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/useInView", () => ({
  useInView: vi.fn(() => ({ ref: { current: null }, isInView: true })),
}));

vi.mock("@/hooks/useDigest", () => ({
  useDigest: vi.fn(() => ({
    digest: null,
    loading: false,
    error: null,
    generateDigest: vi.fn().mockResolvedValue(undefined),
  })),
}));

import DailyDigest from "./DailyDigest";
import { useDigest } from "@/hooks/useDigest";

const mockUseDigest = vi.mocked(useDigest);

const makeDigest = (overrides: Record<string, any> = {}) => ({
  date: "2026-09-01",
  summary: "Strong sales day with 5 orders.",
  metrics: { orders: 5, revenue: 250, profit: 120, stockAlerts: 1, supplierDelays: 0 },
  alerts: [] as any[],
  recommendations: ["Restock item A"],
  weeklyTrend: { direction: "up" as const, percentage: 12, insight: "Revenue trending up" },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
  });
});

describe("DailyDigest", () => {
  it("renders loading state", () => {
    mockUseDigest.mockReturnValue({
      digest: null,
      loading: true,
      error: null,
      generateDigest: vi.fn().mockResolvedValue(undefined),
    });
    render(<DailyDigest />);
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUseDigest.mockReturnValue({
      digest: null,
      loading: false,
      error: "Failed to fetch digest",
      generateDigest: vi.fn().mockResolvedValue(undefined),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Failed to fetch digest")).toBeInTheDocument();
  });

  it("renders 'No digest available' when no digest and not loading", () => {
    mockUseDigest.mockReturnValue({
      digest: null,
      loading: false,
      error: null,
      generateDigest: vi.fn().mockResolvedValue(undefined),
    });
    render(<DailyDigest />);
    expect(screen.getByText("No digest available")).toBeInTheDocument();
    expect(screen.getByText("Generate Digest")).toBeInTheDocument();
  });

  it("calls generateDigest when Generate Digest button clicked", () => {
    const today = new Date().toISOString().slice(0, 10);
    (localStorage.getItem as any).mockReturnValue(today);
    const generateDigest = vi.fn().mockResolvedValue(undefined);
    mockUseDigest.mockReturnValue({
      digest: null,
      loading: false,
      error: null,
      generateDigest,
    });
    render(<DailyDigest />);
    fireEvent.click(screen.getByText("Generate Digest"));
    expect(generateDigest).toHaveBeenCalledTimes(1);
  });

  it("renders digest summary", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({ summary: "Orders are climbing steadily this week." }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Orders are climbing steadily this week.")).toBeInTheDocument();
  });

  it("renders metrics (orders, revenue, profit, stock alerts, delays)", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({
        metrics: { orders: 42, revenue: 3500, profit: 890, stockAlerts: 3, supplierDelays: 1 },
      }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Profit")).toBeInTheDocument();
    expect(screen.getByText("Stock Alerts")).toBeInTheDocument();
    expect(screen.getByText("Delays")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("3500") || content.includes("3,500"))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("890"))).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders MetricCard with prefix", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({ metrics: { orders: 10, revenue: 1000, profit: 250, stockAlerts: 0, supplierDelays: 0 } }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText((content) => content.includes("1000") || content.includes("1,000"))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("250"))).toBeInTheDocument();
  });

  it("renders weekly trend indicator (up)", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({ weeklyTrend: { direction: "up", percentage: 15, insight: "Strong growth" } }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Weekly Trend")).toBeInTheDocument();
    expect(screen.getByText("+15%")).toBeInTheDocument();
    expect(screen.getByText("Strong growth")).toBeInTheDocument();
  });

  it("renders weekly trend indicator (down)", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({ weeklyTrend: { direction: "down", percentage: 8, insight: "Slight decline" } }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("-8%")).toBeInTheDocument();
    expect(screen.getByText("Slight decline")).toBeInTheDocument();
  });

  it("renders weekly trend indicator (stable)", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({ weeklyTrend: { direction: "stable", percentage: 0, insight: "No change" } }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("No change")).toBeInTheDocument();
  });

  it("renders alerts with different types and severities", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({
        alerts: [
          { type: "stock", title: "Low stock warning", description: "Widget X running low", severity: "high" },
          { type: "supplier", title: "Supplier delay", description: "Shipment delayed 2 days", severity: "medium" },
          { type: "adSpend", title: "Ad budget low", description: "Campaign budget 80% spent", severity: "low" },
        ],
      }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(screen.getByText("Low stock warning")).toBeInTheDocument();
    expect(screen.getByText("Widget X running low")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("Supplier delay")).toBeInTheDocument();
    expect(screen.getByText("Shipment delayed 2 days")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
    expect(screen.getByText("Ad budget low")).toBeInTheDocument();
    expect(screen.getByText("Campaign budget 80% spent")).toBeInTheDocument();
    expect(screen.getByText("low")).toBeInTheDocument();
  });

  it("does not render alerts section when no alerts", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({ alerts: [] }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.queryByText("Alerts")).not.toBeInTheDocument();
  });

  it("renders recommendations", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({ recommendations: ["Restock popular items", "Adjust ad spend"] }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Suggested Actions")).toBeInTheDocument();
    expect(screen.getByText("Restock popular items")).toBeInTheDocument();
    expect(screen.getByText("Adjust ad spend")).toBeInTheDocument();
  });

  it("shows Refresh button and handles refresh click", () => {
    const generateDigest = vi.fn().mockResolvedValue(undefined);
    mockUseDigest.mockReturnValue({
      digest: makeDigest(),
      loading: false,
      error: null,
      generateDigest,
    });
    render(<DailyDigest />);
    const refreshBtn = screen.getByText("Refresh");
    expect(refreshBtn).toBeInTheDocument();
    fireEvent.click(refreshBtn);
    expect(generateDigest).toHaveBeenCalledTimes(1);
  });

  it("disables refresh button and shows spinner when loading with digest", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest(),
      loading: true,
      error: null,
      generateDigest: vi.fn().mockResolvedValue(undefined),
    });
    render(<DailyDigest />);
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("renders heading 'Daily Intelligence Digest'", () => {
    mockUseDigest.mockReturnValue({
      digest: null,
      loading: false,
      error: null,
      generateDigest: vi.fn().mockResolvedValue(undefined),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Daily Intelligence Digest")).toBeInTheDocument();
  });

  it("renders AI Summary label", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({ summary: "All metrics healthy." }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("AI Summary")).toBeInTheDocument();
  });

  it("renders Key Metrics label", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest(),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Key Metrics")).toBeInTheDocument();
  });

  it("auto-generates digest when not generated today", async () => {
    const generateDigest = vi.fn().mockResolvedValue(undefined);
    mockUseDigest.mockReturnValue({
      digest: null,
      loading: false,
      error: null,
      generateDigest,
    });
    render(<DailyDigest />);
    await vi.waitFor(() => {
      expect(generateDigest).toHaveBeenCalled();
    });
  });

  it("does not auto-generate digest when already generated today", () => {
    const today = new Date().toISOString().slice(0, 10);
    (localStorage.getItem as any).mockReturnValue(today);
    const generateDigest = vi.fn().mockResolvedValue(undefined);
    mockUseDigest.mockReturnValue({
      digest: null,
      loading: false,
      error: null,
      generateDigest,
    });
    render(<DailyDigest />);
    expect(generateDigest).not.toHaveBeenCalled();
  });

  it("renders trend percentage for up direction with plus prefix", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({ weeklyTrend: { direction: "up", percentage: 20, insight: "Great" } }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("+20%")).toBeInTheDocument();
  });

  it("renders trend percentage for down direction with minus prefix", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({ weeklyTrend: { direction: "down", percentage: 5, insight: "Dip" } }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("-5%")).toBeInTheDocument();
  });

  it("renders alert severity badges", () => {
    mockUseDigest.mockReturnValue({
      digest: makeDigest({
        alerts: [
          { type: "stock", title: "Low", description: "desc", severity: "low" },
          { type: "supplier", title: "Med", description: "desc", severity: "medium" },
          { type: "trend", title: "High", description: "desc", severity: "high" },
        ],
      }),
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("low")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("shows '...' instead of 'Refresh' text when loading with no digest", () => {
    mockUseDigest.mockReturnValue({
      digest: null,
      loading: true,
      error: null,
      generateDigest: vi.fn().mockResolvedValue(undefined),
    });
    render(<DailyDigest />);
    expect(screen.queryByText("Refresh")).not.toBeInTheDocument();
  });
});
