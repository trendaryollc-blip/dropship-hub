import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketStatsBar from "./MarketStatsBar";
import type { MarketData } from "@/types/competitors";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("lucide-react", () => ({
  Package: () => <div data-testid="package" />,
  DollarSign: () => <div data-testid="dollar-sign" />,
  BarChart3: () => <div data-testid="bar-chart" />,
  Target: () => <div data-testid="target" />,
  TrendingUp: () => <div data-testid="trending-up" />,
}));

const mockData: MarketData["totalListings"] extends never
  ? MarketData
  : MarketData = {
    query: "wireless mouse",
    totalListings: 150,
    avgPrice: 22.5,
    medianPrice: 19.99,
    minPrice: 5.99,
    maxPrice: 49.99,
    profitZone: { min: 15, max: 30, label: "Optimal Zone" },
    priceDistribution: [],
    platforms: [],
    topSellers: [],
    opportunities: [],
    pricingOptions: [],
    priceHistory: [],
    insights: [],
  };

describe("MarketStatsBar", () => {
  it("renders all stat labels", () => {
    render(<MarketStatsBar data={mockData} />);
    expect(screen.getByText("Listings")).toBeInTheDocument();
    expect(screen.getByText("Price Range")).toBeInTheDocument();
    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(screen.getByText("Median")).toBeInTheDocument();
    expect(screen.getByText("Profit Zone")).toBeInTheDocument();
  });

  it("displays correct stat values", () => {
    render(<MarketStatsBar data={mockData} />);
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("$5-$49")).toBeInTheDocument();
    expect(screen.getByText("$22.50")).toBeInTheDocument();
    expect(screen.getByText("$19.99")).toBeInTheDocument();
    expect(screen.getByText("$15-$30")).toBeInTheDocument();
  });

  it("shows profit zone label", () => {
    render(<MarketStatsBar data={mockData} />);
    expect(screen.getByText("Optimal Zone")).toBeInTheDocument();
  });

  it("shows min and max price labels on the bar", () => {
    render(<MarketStatsBar data={mockData} />);
    expect(screen.getByText("$5")).toBeInTheDocument();
    expect(screen.getByText("$49")).toBeInTheDocument();
  });
});
