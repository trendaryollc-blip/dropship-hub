import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DeliveryTimeline from "./DeliveryTimeline";
import type { DeliveryPredictionResult } from "@/types/shipping";

const mockPrediction: DeliveryPredictionResult = {
  carrierId: "dhl",
  carrierName: "DHL Express",
  originCountry: "CN",
  destinationCountry: "US",
  serviceLevel: "express",
  predictedDays: { min: 3, max: 7, average: 5 },
  confidence: 0.85,
  riskFactors: [
    { type: "weather", severity: "low", description: "Seasonal weather patterns", estimatedDelayDays: 1 },
    { type: "customs", severity: "medium", description: "Customs processing time", estimatedDelayDays: 2 },
  ],
  shipByDate: "2024-01-15",
  estimatedArrival: { earliest: "2024-01-18", latest: "2024-01-22", average: "2024-01-20" },
  historicalAccuracy: 0.92,
  weatherDelayRisk: 1,
  customsDelayRisk: 2,
  holidayDelayRisk: 0,
};

describe("DeliveryTimeline", () => {
  it("renders heading", () => {
    render(<DeliveryTimeline prediction={mockPrediction} />);
    expect(screen.getByText("Delivery Prediction")).toBeInTheDocument();
  });

  it("displays confidence percentage", () => {
    render(<DeliveryTimeline prediction={mockPrediction} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("shows ship date", () => {
    render(<DeliveryTimeline prediction={mockPrediction} />);
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();
  });

  it("displays estimated arrival dates", () => {
    render(<DeliveryTimeline prediction={mockPrediction} />);
    const matches = screen.getAllByText("2024-01-20");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows date range cards", () => {
    render(<DeliveryTimeline prediction={mockPrediction} />);
    expect(screen.getByText("Earliest")).toBeInTheDocument();
    expect(screen.getByText("Latest")).toBeInTheDocument();
  });

  it("displays earliest and latest dates", () => {
    render(<DeliveryTimeline prediction={mockPrediction} />);
    expect(screen.getByText("2024-01-18")).toBeInTheDocument();
    expect(screen.getByText("2024-01-22")).toBeInTheDocument();
  });

  it("shows predicted days", () => {
    render(<DeliveryTimeline prediction={mockPrediction} />);
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(screen.getByText("7 days")).toBeInTheDocument();
  });

  it("displays weather delay risk", () => {
    render(<DeliveryTimeline prediction={mockPrediction} />);
    expect(screen.getByText("+1d weather")).toBeInTheDocument();
  });

  it("displays customs delay risk", () => {
    render(<DeliveryTimeline prediction={mockPrediction} />);
    expect(screen.getByText("+2d customs")).toBeInTheDocument();
  });

  it("shows risk factors", () => {
    render(<DeliveryTimeline prediction={mockPrediction} />);
    expect(screen.getByText("Seasonal weather patterns")).toBeInTheDocument();
    expect(screen.getByText("Customs processing time")).toBeInTheDocument();
  });

  it("shows historical accuracy", () => {
    render(<DeliveryTimeline prediction={mockPrediction} />);
    expect(screen.getByText("Historical accuracy")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("shows holiday delay when present", () => {
    const withHoliday = { ...mockPrediction, holidayDelayRisk: 3 };
    render(<DeliveryTimeline prediction={withHoliday} />);
    expect(screen.getByText("+3d holiday")).toBeInTheDocument();
  });
});
