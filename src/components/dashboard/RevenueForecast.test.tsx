import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RevenueForecast from "./RevenueForecast";
import type { RevenueStat } from "@/types/dashboard";

const makeStats = (): RevenueStat[] => [
  { label: "Revenue This Month", value: 4200, change: "+12%", up: true, icon: "dollar", color: "text-emerald-400", sparkline: [100, 200, 300, 400, 500] },
  { label: "Products Analyzed", value: 156, change: "+8%", up: true, icon: "package", color: "text-blue-400", sparkline: [50, 60, 70, 80, 90] },
  { label: "Active Orders", value: 23, change: "-2%", up: false, icon: "cart", color: "text-amber-400", sparkline: [30, 25, 28, 22, 23] },
  { label: "Est. Profit", value: 1800, change: "+15%", up: true, icon: "trending", color: "text-purple-400", sparkline: [80, 100, 120, 140, 160] },
];

const actual = [
  { date: "Jan", value: 100 },
  { date: "Feb", value: 200 },
  { date: "Mar", value: 150 },
  { date: "Apr", value: 300 },
];

const predicted = [
  { date: "May", value: 350 },
  { date: "Jun", value: 400 },
];

describe("RevenueForecast", () => {
  it("renders revenue forecast heading", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    expect(screen.getAllByText("Revenue Forecast").length).toBeGreaterThanOrEqual(1);
  });

  it("renders subtitle", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    expect(screen.getByText("Last 30 days + 14-day projection")).toBeInTheDocument();
  });

  it("renders View Full Report button", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    expect(screen.getByText("View Full Report")).toBeInTheDocument();
  });

  it("renders timeframe buttons", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    expect(screen.getByText("7d")).toBeInTheDocument();
    expect(screen.getByText("30d")).toBeInTheDocument();
    expect(screen.getByText("90d")).toBeInTheDocument();
  });

  it("renders stat labels", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    expect(screen.getByText("Revenue This Month")).toBeInTheDocument();
    expect(screen.getByText("Products Analyzed")).toBeInTheDocument();
    expect(screen.getByText("Active Orders")).toBeInTheDocument();
    expect(screen.getByText("Est. Profit")).toBeInTheDocument();
  });

  it("shows empty state when no data points", () => {
    render(<RevenueForecast actual={[]} predicted={[]} stats={makeStats()} />);
    expect(screen.getByText(/No revenue data yet/)).toBeInTheDocument();
  });

  it("renders SVG chart when data present", () => {
    const { container } = render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("renders Actual and Predicted legend", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    expect(screen.getByText("Actual")).toBeInTheDocument();
    expect(screen.getByText("Predicted")).toBeInTheDocument();
  });
});
