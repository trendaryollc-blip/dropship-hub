import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StorePerformanceCard from "./StorePerformanceCard";
import type { StorePerformance } from "@/types/multi-store";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

const mockPerf: StorePerformance = {
  storeId: "s1",
  storeName: "My Shopify Store",
  storePlatform: "shopify",
  metrics: {
    totalOrders: 120,
    totalRevenue: 15000,
    totalProfit: 4500,
    avgOrderValue: 125,
    conversionRate: 3.2,
    returnRate: 2.1,
    fulfillmentRate: 95,
    avgShippingDays: 5,
  },
  trends: {
    ordersTrend: 12,
    revenueTrend: -3,
    profitTrend: 0,
  },
  period: "30d",
};

describe("StorePerformanceCard", () => {
  it("renders store name and platform", () => {
    render(<StorePerformanceCard perf={mockPerf} delay={0} />);
    expect(screen.getByText("My Shopify Store")).toBeInTheDocument();
    expect(screen.getByText("shopify")).toBeInTheDocument();
  });

  it("renders metrics: orders, revenue, avg order, conv rate", () => {
    render(<StorePerformanceCard perf={mockPerf} delay={0} />);
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("$15,000")).toBeInTheDocument();
    expect(screen.getByText("$125.00")).toBeInTheDocument();
    expect(screen.getByText("3.2%")).toBeInTheDocument();
  });

  it("renders trend indicators", () => {
    render(<StorePerformanceCard perf={mockPerf} delay={0} />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
    const revenueBlock = screen.getByText("Revenue").closest("div")!;
    expect(revenueBlock.textContent).toContain("-3");
  });

  it("shows period label", () => {
    render(<StorePerformanceCard perf={mockPerf} delay={0} />);
    expect(screen.getByText("30d")).toBeInTheDocument();
  });

  it("applies correct trend colors", () => {
    render(<StorePerformanceCard perf={mockPerf} delay={0} />);
    expect(screen.getByText("+12%")).toHaveClass("text-emerald-400");
    const spans = document.querySelectorAll("span");
    const negativeTrend = Array.from(spans).find((s) => s.className.includes("text-red-400"));
    expect(negativeTrend).toBeDefined();
    expect(negativeTrend!.className).toContain("text-red-400");
  });
});
