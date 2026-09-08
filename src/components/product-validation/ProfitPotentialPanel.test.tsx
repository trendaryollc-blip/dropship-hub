import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfitPotentialPanel from "./ProfitPotentialPanel";
import type { ProfitPotentialResult } from "@/types/product-validation";

vi.mock("lucide-react", () => ({
  DollarSign: () => <div data-testid="dollar-sign" />,
  AlertCircle: () => <div data-testid="alert-circle" />,
}));

const mockData: ProfitPotentialResult = {
  score: 78,
  netProfitPerUnit: 8.5,
  profitMargin: 28,
  roi: 65,
  breakEvenROAS: 2.5,
  monthlyNetProfit: 850,
  monthlyROI: 45,
  costBreakdown: [
    { name: "Product", value: 8, pct: 40, color: "#f59e0b" },
    { name: "Shipping", value: 4.5, pct: 25, color: "#3b82f6" },
    { name: "Platform Fee", value: 3.9, pct: 20, color: "#8b5cf6" },
    { name: "Ads", value: 2.4, pct: 15, color: "#ef4444" },
  ],
  riskAdjustedReturn: 55,
  insight: "Good profit margins with room for optimization",
};

describe("ProfitPotentialPanel", () => {
  it("renders title and subtitle", () => {
    render(<ProfitPotentialPanel data={mockData} />);
    expect(screen.getByText("Profit Potential")).toBeInTheDocument();
    expect(screen.getByText("Revenue after all costs")).toBeInTheDocument();
  });

  it("renders score badge", () => {
    render(<ProfitPotentialPanel data={mockData} />);
    expect(screen.getByText("Score: 78")).toBeInTheDocument();
  });

  it("renders per unit profit", () => {
    render(<ProfitPotentialPanel data={mockData} />);
    expect(screen.getByText("$8.50")).toBeInTheDocument();
  });

  it("renders margin", () => {
    render(<ProfitPotentialPanel data={mockData} />);
    expect(screen.getByText("28%")).toBeInTheDocument();
  });

  it("renders ROI", () => {
    render(<ProfitPotentialPanel data={mockData} />);
    expect(screen.getByText("65%")).toBeInTheDocument();
  });

  it("renders monthly net profit", () => {
    render(<ProfitPotentialPanel data={mockData} />);
    expect(screen.getByText("$850.00")).toBeInTheDocument();
  });

  it("renders break-even ROAS", () => {
    render(<ProfitPotentialPanel data={mockData} />);
    expect(screen.getByText("2.5x")).toBeInTheDocument();
  });

  it("renders cost breakdown legend", () => {
    render(<ProfitPotentialPanel data={mockData} />);
    expect(screen.getByText(/Product/)).toBeInTheDocument();
    expect(screen.getByText(/Shipping/)).toBeInTheDocument();
    expect(screen.getByText(/Platform Fee/)).toBeInTheDocument();
    expect(screen.getByText(/Ads/)).toBeInTheDocument();
  });

  it("renders insight", () => {
    render(<ProfitPotentialPanel data={mockData} />);
    expect(screen.getByText("Good profit margins with room for optimization")).toBeInTheDocument();
  });

  it("shows loss warning when net profit <= 0", () => {
    render(<ProfitPotentialPanel data={{ ...mockData, netProfitPerUnit: -2 }} />);
    expect(screen.getByText(/not profitable/)).toBeInTheDocument();
  });

  it("hides loss warning when net profit > 0", () => {
    render(<ProfitPotentialPanel data={mockData} />);
    expect(screen.queryByText(/not profitable/)).not.toBeInTheDocument();
  });

  it("renders negative profit as loss", () => {
    render(<ProfitPotentialPanel data={{ ...mockData, netProfitPerUnit: -2 }} />);
    expect(screen.getByText("loss")).toBeInTheDocument();
  });

  it("hides cost breakdown when empty", () => {
    render(<ProfitPotentialPanel data={{ ...mockData, costBreakdown: [] }} />);
    expect(screen.queryByText("Cost Breakdown")).not.toBeInTheDocument();
  });

  it("renders required icons", () => {
    render(<ProfitPotentialPanel data={mockData} />);
    expect(screen.getByTestId("dollar-sign")).toBeInTheDocument();
  });
});
