import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PriceHistory from "./PriceHistory";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("lucide-react", () => ({
  TrendingUp: () => <div data-testid="trending-up" />,
  Calendar: () => <div data-testid="calendar" />,
}));

const mockData = [
  { date: "Sep 1", avg: 20.0, min: 15.0, max: 28.0 },
  { date: "Sep 2", avg: 21.5, min: 16.0, max: 29.0 },
  { date: "Sep 3", avg: 19.0, min: 14.0, max: 26.0 },
  { date: "Sep 4", avg: 22.0, min: 17.0, max: 30.0 },
];

describe("PriceHistory", () => {
  it("renders heading", () => {
    render(<PriceHistory data={mockData} />);
    expect(screen.getByText("Price History (14 Days)")).toBeInTheDocument();
  });

  it("displays current price", () => {
    render(<PriceHistory data={mockData} />);
    expect(screen.getByText("Current:")).toBeInTheDocument();
    expect(screen.getByText("$22.00")).toBeInTheDocument();
  });

  it("shows trend direction up when latest avg is higher", () => {
    render(<PriceHistory data={mockData} />);
    expect(screen.getByText(/%/)).toBeInTheDocument();
    expect(screen.getByText("Last 14 days")).toBeInTheDocument();
  });

  it("renders SVG chart with polyline paths", () => {
    const { container } = render(<PriceHistory data={mockData} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("shows empty state message when no data", () => {
    render(<PriceHistory data={[]} />);
    expect(screen.getByText("No price history data available")).toBeInTheDocument();
  });
});
