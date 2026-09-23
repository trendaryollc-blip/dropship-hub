import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { RevenueProfitHub } from "./RevenueProfitHub";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const props = {
  stats: { revenue: 5000, growth: 10, orders: 100, avgOrder: 50, profit: 1500 },
  chartData: [{ date: "2026-09-01", value: 5000 }],
  storesConnected: 2,
  suppliersActive: 3,
  pendingOrders: 4,
  marginPct: 30,
};

describe("RevenueProfitHub Profit Tracker", () => {
  it("headlines profit per order instead of average order value", () => {
    render(<RevenueProfitHub {...props} />);
    expect(screen.getByText("Profit per Order")).toBeInTheDocument();
    expect(screen.getByText("$15.00")).toBeInTheDocument();
  });

  it("keeps average order value as a secondary metric", () => {
    render(<RevenueProfitHub {...props} />);
    expect(screen.getByText("Avg. Order Value")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });

  it("shows total profit alongside revenue and orders", () => {
    render(<RevenueProfitHub {...props} />);
    expect(screen.getByText("Total Profit")).toBeInTheDocument();
    expect(screen.getByText("$1,500")).toBeInTheDocument();
  });

  it("renders $0.00 profit per order when there are no orders", () => {
    render(<RevenueProfitHub {...props} stats={{ ...props.stats, orders: 0 }} />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
});