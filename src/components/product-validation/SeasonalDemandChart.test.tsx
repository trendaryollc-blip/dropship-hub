import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SeasonalDemandChart from "./SeasonalDemandChart";
import type { SeasonalDemandResult } from "@/types/product-validation";

vi.mock("lucide-react", () => ({
  Calendar: () => <div data-testid="calendar" />,
}));

const mockData: SeasonalDemandResult = {
  score: 72,
  peakMonth: 12,
  lowMonth: 3,
  seasonalityIndex: 0.35,
  currentPhase: "building",
  forecast: [
    { month: "Jul", predicted: 500, confidence: 0.8 },
    { month: "Aug", predicted: 650, confidence: 0.75 },
    { month: "Sep", predicted: 800, confidence: 0.7 },
  ],
  monthLabels: ["Jul", "Aug", "Sep"],
  insight: "Building toward peak season",
};

describe("SeasonalDemandChart", () => {
  it("renders title and subtitle", () => {
    render(<SeasonalDemandChart data={mockData} />);
    expect(screen.getByText("Seasonal Demand")).toBeInTheDocument();
    expect(screen.getByText("Monthly demand patterns")).toBeInTheDocument();
  });

  it("renders phase label", () => {
    render(<SeasonalDemandChart data={mockData} />);
    expect(screen.getByText("Building")).toBeInTheDocument();
  });

  it("renders peak month", () => {
    render(<SeasonalDemandChart data={mockData} />);
    expect(screen.getByText("Dec")).toBeInTheDocument();
  });

  it("renders low month", () => {
    render(<SeasonalDemandChart data={mockData} />);
    expect(screen.getByText("Mar")).toBeInTheDocument();
  });

  it("renders seasonality index as percentage", () => {
    render(<SeasonalDemandChart data={mockData} />);
    expect(screen.getByText("35%")).toBeInTheDocument();
  });

  it("renders forecast months", () => {
    render(<SeasonalDemandChart data={mockData} />);
    expect(screen.getByText("Jul")).toBeInTheDocument();
    expect(screen.getByText("Aug")).toBeInTheDocument();
    expect(screen.getByText("Sep")).toBeInTheDocument();
  });

  it("renders forecast predicted values", () => {
    render(<SeasonalDemandChart data={mockData} />);
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("650")).toBeInTheDocument();
  });

  it("renders score", () => {
    render(<SeasonalDemandChart data={mockData} />);
    expect(screen.getByText("72/100")).toBeInTheDocument();
  });

  it("renders insight", () => {
    render(<SeasonalDemandChart data={mockData} />);
    expect(screen.getByText("Building toward peak season")).toBeInTheDocument();
  });

  it("hides forecast when empty", () => {
    render(<SeasonalDemandChart data={{ ...mockData, forecast: [], monthLabels: [] }} />);
    expect(screen.queryByText("6-Month Forecast")).not.toBeInTheDocument();
  });

  it("renders peak phase", () => {
    render(<SeasonalDemandChart data={{ ...mockData, currentPhase: "peak" }} />);
    expect(screen.getByText("Peak Season")).toBeInTheDocument();
  });

  it("renders off-peak phase", () => {
    render(<SeasonalDemandChart data={{ ...mockData, currentPhase: "off-peak" }} />);
    expect(screen.getByText("Off-Peak")).toBeInTheDocument();
  });

  it("renders required icons", () => {
    render(<SeasonalDemandChart data={mockData} />);
    expect(screen.getByTestId("calendar")).toBeInTheDocument();
  });
});
