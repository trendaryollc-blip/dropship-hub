import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketIntelligence from "./MarketIntelligence";
import type { MarketIntel } from "@/types/enrichment";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

const mockData: MarketIntel = {
  trendDirection: "rising",
  trendSparkline: [20, 30, 25, 40, 35, 50],
  searchVolume: "high",
  searchVolumeNumber: 45000,
  seasonality: "Peak demand in Q4",
  bestTimeToSell: "October - December",
  competitionLevel: "medium",
  estimatedSellers: 1250,
  avgSellerRating: 4.1,
  priceWarRisk: "medium",
  canCompete: "Yes, with differentiated listings",
  riskScore: 45,
  riskFactors: [
    { label: "Seasonal dependency", level: "caution" },
    { label: "Established sellers", level: "danger" },
    { label: "Good margins", level: "safe" },
  ],
};

describe("MarketIntelligence", () => {
  it("renders heading", () => {
    render(<MarketIntelligence data={mockData} />);
    expect(screen.getByText("Market Intelligence")).toBeInTheDocument();
  });

  it("displays trend direction", () => {
    render(<MarketIntelligence data={mockData} />);
    expect(screen.getByText("rising")).toBeInTheDocument();
  });

  it("shows search volume", () => {
    render(<MarketIntelligence data={mockData} />);
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("45,000 searches/mo")).toBeInTheDocument();
  });

  it("displays seasonality", () => {
    render(<MarketIntelligence data={mockData} />);
    expect(screen.getByText("Peak demand in Q4")).toBeInTheDocument();
    expect(screen.getByText("October - December")).toBeInTheDocument();
  });

  it("shows competition level", () => {
    render(<MarketIntelligence data={mockData} />);
    const matches = screen.getAllByText("medium");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("displays seller stats", () => {
    render(<MarketIntelligence data={mockData} />);
    expect(screen.getByText("1,250")).toBeInTheDocument();
    expect(screen.getByText("4.1")).toBeInTheDocument();
  });

  it("shows can compete assessment", () => {
    render(<MarketIntelligence data={mockData} />);
    expect(screen.getByText("Yes, with differentiated listings")).toBeInTheDocument();
  });

  it("shows risk factors", () => {
    render(<MarketIntelligence data={mockData} />);
    expect(screen.getByText("Seasonal dependency")).toBeInTheDocument();
    expect(screen.getByText("Established sellers")).toBeInTheDocument();
    expect(screen.getByText("Good margins")).toBeInTheDocument();
  });

  it("shows risk score", () => {
    render(<MarketIntelligence data={mockData} />);
    expect(screen.getByText("45")).toBeInTheDocument();
  });

  it("shows price war risk", () => {
    render(<MarketIntelligence data={mockData} />);
    const matches = screen.getAllByText("medium");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when data is null", () => {
    render(<MarketIntelligence data={null} />);
    expect(screen.getByText("Market intelligence unavailable")).toBeInTheDocument();
  });
});
