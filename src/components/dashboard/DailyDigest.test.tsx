import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/useDigest", () => ({
  useDigest: vi.fn(() => ({
    digest: null,
    loading: false,
    error: null,
    generateDigest: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@/lib/firebase-messaging", () => ({
  requestNotificationPermission: vi.fn(),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(),
}));

import DailyDigest from "./DailyDigest";
import { useDigest } from "@/hooks/useDigest";

const mockUseDigest = vi.mocked(useDigest);

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
  it("renders heading when no digest", () => {
    mockUseDigest.mockReturnValue({ digest: null, loading: false, error: null, generateDigest: vi.fn().mockResolvedValue(undefined) });
    render(<DailyDigest />);
    expect(screen.getByText("Daily Intelligence Digest")).toBeInTheDocument();
  });

  it("renders Generate Digest button when no digest", () => {
    mockUseDigest.mockReturnValue({ digest: null, loading: false, error: null, generateDigest: vi.fn().mockResolvedValue(undefined) });
    render(<DailyDigest />);
    expect(screen.getByText("Generate Digest")).toBeInTheDocument();
  });

  it("calls generateDigest when button clicked", () => {
    const generateDigest = vi.fn().mockResolvedValue(undefined);
    mockUseDigest.mockReturnValue({ digest: null, loading: false, error: null, generateDigest });
    render(<DailyDigest />);
    fireEvent.click(screen.getByText("Generate Digest"));
    expect(generateDigest).toHaveBeenCalled();
  });

  it("renders loading state", () => {
    mockUseDigest.mockReturnValue({ digest: null, loading: true, error: null, generateDigest: vi.fn().mockResolvedValue(undefined) });
    render(<DailyDigest />);
    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  it("renders error message", () => {
    mockUseDigest.mockReturnValue({ digest: null, loading: false, error: "Failed to fetch", generateDigest: vi.fn().mockResolvedValue(undefined) });
    render(<DailyDigest />);
    expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
  });

  it("renders digest data when available", () => {
    mockUseDigest.mockReturnValue({
      digest: {
        date: "2026-09-01",
        summary: "Strong sales day with 5 orders.",
        metrics: { orders: 5, revenue: 250, profit: 120, stockAlerts: 1, supplierDelays: 0 },
        alerts: [],
        recommendations: ["Restock item A"],
        weeklyTrend: { direction: "up", percentage: 12, insight: "Revenue trending up" },
      },
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Strong sales day with 5 orders.")).toBeInTheDocument();
  });

  it("renders metrics grid", () => {
    mockUseDigest.mockReturnValue({
      digest: {
        date: "2026-09-01",
        summary: "Test",
        metrics: { orders: 5, revenue: 250, profit: 120, stockAlerts: 1, supplierDelays: 0 },
        alerts: [],
        recommendations: [],
        weeklyTrend: { direction: "up", percentage: 10, insight: "Trending" },
      },
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Profit")).toBeInTheDocument();
    expect(screen.getByText("Stock Alerts")).toBeInTheDocument();
    expect(screen.getByText("Supplier Delays")).toBeInTheDocument();
  });

  it("renders weekly trend section", () => {
    mockUseDigest.mockReturnValue({
      digest: {
        date: "2026-09-01",
        summary: "Test",
        metrics: { orders: 0, revenue: 0, profit: 0, stockAlerts: 0, supplierDelays: 0 },
        alerts: [],
        recommendations: [],
        weeklyTrend: { direction: "up", percentage: 15, insight: "Strong growth" },
      },
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Weekly Trend")).toBeInTheDocument();
    expect(screen.getByText("+15%")).toBeInTheDocument();
  });

  it("renders alerts when present", () => {
    mockUseDigest.mockReturnValue({
      digest: {
        date: "2026-09-01",
        summary: "Test",
        metrics: { orders: 0, revenue: 0, profit: 0, stockAlerts: 0, supplierDelays: 0 },
        alerts: [{ type: "stock", title: "Low stock", description: "Item X is low", severity: "high" }],
        recommendations: [],
        weeklyTrend: { direction: "stable", percentage: 0, insight: "Flat" },
      },
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Low stock")).toBeInTheDocument();
    expect(screen.getByText("Proactive Alerts")).toBeInTheDocument();
  });

  it("renders recommendations", () => {
    mockUseDigest.mockReturnValue({
      digest: {
        date: "2026-09-01",
        summary: "Test",
        metrics: { orders: 0, revenue: 0, profit: 0, stockAlerts: 0, supplierDelays: 0 },
        alerts: [],
        recommendations: ["Restock popular items", "Adjust pricing"],
        weeklyTrend: { direction: "down", percentage: 5, insight: "Slight dip" },
      },
      loading: false,
      error: null,
      generateDigest: vi.fn(),
    });
    render(<DailyDigest />);
    expect(screen.getByText("Suggested Actions")).toBeInTheDocument();
    expect(screen.getByText("Restock popular items")).toBeInTheDocument();
    expect(screen.getByText("Adjust pricing")).toBeInTheDocument();
  });
});
