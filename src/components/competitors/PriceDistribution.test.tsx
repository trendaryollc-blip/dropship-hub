import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PriceDistribution from "./PriceDistribution";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("lucide-react", () => ({
  BarChart3: () => <div data-testid="bar-chart" />,
  Sparkles: () => <div data-testid="sparkles" />,
}));

const mockTiers = [
  { range: "$0-$10", count: 5, percent: 10, isSweetSpot: false },
  { range: "$10-$20", count: 25, percent: 50, isSweetSpot: true },
  { range: "$20-$30", count: 12, percent: 24, isSweetSpot: false },
  { range: "$30-$50", count: 8, percent: 16, isSweetSpot: false },
];

describe("PriceDistribution", () => {
  it("renders heading and AI badge", () => {
    render(<PriceDistribution tiers={mockTiers} avgPrice={20} />);
    expect(screen.getByText("Price Distribution")).toBeInTheDocument();
    expect(screen.getByText("AI Analyzed")).toBeInTheDocument();
  });

  it("renders all tier ranges", () => {
    render(<PriceDistribution tiers={mockTiers} avgPrice={20} />);
    expect(screen.getByText("$0-$10")).toBeInTheDocument();
    expect(screen.getByText("$10-$20")).toBeInTheDocument();
    expect(screen.getByText("$20-$30")).toBeInTheDocument();
    expect(screen.getByText("$30-$50")).toBeInTheDocument();
  });

  it("displays seller counts for each tier", () => {
    render(<PriceDistribution tiers={mockTiers} avgPrice={20} />);
    expect(screen.getByText("5 sellers")).toBeInTheDocument();
    expect(screen.getByText("25 sellers")).toBeInTheDocument();
    expect(screen.getByText("12 sellers")).toBeInTheDocument();
    expect(screen.getByText("8 sellers")).toBeInTheDocument();
  });

  it("shows sweet spot badge for marked tiers", () => {
    render(<PriceDistribution tiers={mockTiers} avgPrice={20} />);
    expect(screen.getByText("SWEET SPOT")).toBeInTheDocument();
  });

  it("displays market insight with price range", () => {
    render(<PriceDistribution tiers={mockTiers} avgPrice={20} />);
    expect(screen.getByText("Market Insight:")).toBeInTheDocument();
    expect(screen.getByText("$16.00 - $22.00")).toBeInTheDocument();
  });
});
