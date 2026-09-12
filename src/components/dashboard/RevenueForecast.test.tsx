import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RevenueForecast from "./RevenueForecast";
import type { RevenueStat } from "@/types/dashboard";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAnimatedCounter", () => ({
  useAnimatedCounter: (value: number) => value,
}));

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
    expect(screen.getByText("Full")).toBeInTheDocument();
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

  it("renders stat values", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    expect(screen.getByText("4,200")).toBeInTheDocument();
    expect(screen.getByText("156")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("1,800")).toBeInTheDocument();
  });

  it("renders stat change percentages", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
    expect(screen.getByText("+8%")).toBeInTheDocument();
    expect(screen.getByText("-2%")).toBeInTheDocument();
    expect(screen.getByText("+15%")).toBeInTheDocument();
  });

  it("renders sparklines in stats", () => {
    const { container } = render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(3);
  });

  it("renders timeframe button with active state", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    const btn30d = screen.getByText("30d");
    expect(btn30d).toBeInTheDocument();
  });

  it("clicks 7d timeframe button", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    fireEvent.click(screen.getByText("7d"));
    expect(screen.getByText("7d")).toBeInTheDocument();
  });

  it("clicks 90d timeframe button", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    fireEvent.click(screen.getByText("90d"));
    expect(screen.getByText("90d")).toBeInTheDocument();
  });

  it("renders with empty stats", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={[]} />);
    expect(screen.getAllByText("Revenue Forecast").length).toBeGreaterThanOrEqual(1);
  });

  it("renders with single stat", () => {
    const singleStat = [makeStats()[0]];
    render(<RevenueForecast actual={actual} predicted={predicted} stats={singleStat} />);
    expect(screen.getByText("Revenue This Month")).toBeInTheDocument();
  });

  it("renders Full Report link", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    const link = screen.getByText("Full").closest("a");
    expect(link).toBeInTheDocument();
  });

  it("renders empty chart state", () => {
    render(<RevenueForecast actual={[]} predicted={[]} stats={makeStats()} />);
    expect(screen.getByText(/No revenue data yet/)).toBeInTheDocument();
  });

  it("renders chart with data only", () => {
    const { container } = render(<RevenueForecast actual={actual} predicted={[]} stats={makeStats()} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("renders stat change direction indicators", () => {
    render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    const upStats = screen.getAllByText(/\+\d+%/);
    expect(upStats.length).toBeGreaterThanOrEqual(1);
    const downStats = screen.getAllByText(/-\d+%/);
    expect(downStats.length).toBeGreaterThanOrEqual(1);
  });

  it("shows tooltip on SVG mouse move", () => {
    const { container } = render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    const mainSvg = container.querySelector("svg.w-full");
    expect(mainSvg).toBeInTheDocument();
    const rect = { left: 50, top: 20, width: 500, height: 200 };
    mainSvg!.getBoundingClientRect = vi.fn().mockReturnValue(rect);
    fireEvent.mouseMove(mainSvg!, { clientX: 200, clientY: 100 });
    const tooltipLine = mainSvg!.querySelector("line[stroke-dasharray]");
    expect(tooltipLine).toBeInTheDocument();
  });

  it("hides tooltip on SVG mouse leave", () => {
    const { container } = render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    const mainSvg = container.querySelector("svg.w-full");
    const rect = { left: 50, top: 20, width: 500, height: 200 };
    mainSvg!.getBoundingClientRect = vi.fn().mockReturnValue(rect);
    fireEvent.mouseMove(mainSvg!, { clientX: 200, clientY: 100 });
    expect(mainSvg!.querySelector("line[stroke-dasharray]")).toBeInTheDocument();
    fireEvent.mouseLeave(mainSvg!);
    expect(mainSvg!.querySelector("line[stroke-dasharray]")).toBeNull();
  });

  it("tooltip shows date and value", () => {
    const { container } = render(<RevenueForecast actual={actual} predicted={predicted} stats={makeStats()} />);
    const mainSvg = container.querySelector("svg.w-full");
    const rect = { left: 50, top: 20, width: 500, height: 200 };
    mainSvg!.getBoundingClientRect = vi.fn().mockReturnValue(rect);
    fireEvent.mouseMove(mainSvg!, { clientX: 200, clientY: 100 });
    const tooltipCircle = mainSvg!.querySelector("circle[r='5']");
    expect(tooltipCircle).toBeInTheDocument();
    const tooltipText = mainSvg!.querySelectorAll("text");
    const valueText = Array.from(tooltipText).find((t) => t.textContent?.startsWith("$") && t.textContent?.includes(" - "));
    expect(valueText).toBeInTheDocument();
  });
});
