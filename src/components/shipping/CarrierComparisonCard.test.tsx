import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CarrierComparisonCard from "./CarrierComparisonCard";
import type { CarrierRateResponse } from "@/types/shipping";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

const mockRate: CarrierRateResponse = {
  carrierId: "dhl",
  carrierName: "DHL Express",
  serviceLevel: "express",
  cost: 25.50,
  currency: "USD",
  estimatedDays: { min: 3, max: 5 },
  trackingIncluded: true,
  insuranceIncluded: true,
  insuranceCost: 2.50,
  guaranteedDelivery: true,
  reliabilityScore: 95,
  customsHandled: true,
};

const mockCheapestRate: CarrierRateResponse = {
  ...mockRate,
  carrierId: "epacket",
  carrierName: "ePacket",
  serviceLevel: "economy",
  cost: 8.99,
  reliabilityScore: 85,
};

describe("CarrierComparisonCard", () => {
  it("renders carrier name", () => {
    render(<CarrierComparisonCard rate={mockRate} />);
    expect(screen.getByText("DHL Express")).toBeInTheDocument();
  });

  it("displays cost", () => {
    render(<CarrierComparisonCard rate={mockRate} />);
    expect(screen.getByText("$25.50")).toBeInTheDocument();
  });

  it("shows service level badge", () => {
    render(<CarrierComparisonCard rate={mockRate} />);
    expect(screen.getByText("express")).toBeInTheDocument();
  });

  it("shows delivery days", () => {
    render(<CarrierComparisonCard rate={mockRate} />);
    expect(screen.getByText("3-5 days")).toBeInTheDocument();
  });

  it("shows reliability score", () => {
    render(<CarrierComparisonCard rate={mockRate} />);
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("shows tracking when included", () => {
    render(<CarrierComparisonCard rate={mockRate} />);
    expect(screen.getByText("Tracking")).toBeInTheDocument();
  });

  it("shows insurance when included", () => {
    render(<CarrierComparisonCard rate={mockRate} />);
    expect(screen.getByText("Insurance")).toBeInTheDocument();
  });

  it("shows guaranteed badge when included", () => {
    render(<CarrierComparisonCard rate={mockRate} />);
    expect(screen.getByText("Guaranteed")).toBeInTheDocument();
  });

  it("shows customs badge when included", () => {
    render(<CarrierComparisonCard rate={mockRate} />);
    expect(screen.getByText("Customs")).toBeInTheDocument();
  });

  it("shows cheapest badge", () => {
    render(<CarrierComparisonCard rate={mockCheapestRate} isCheapest />);
    expect(screen.getByText("Cheapest")).toBeInTheDocument();
  });

  it("shows fastest badge", () => {
    render(<CarrierComparisonCard rate={mockRate} isFastest />);
    expect(screen.getByText("Fastest")).toBeInTheDocument();
  });

  it("shows best value badge", () => {
    render(<CarrierComparisonCard rate={mockRate} isBestValue />);
    expect(screen.getByText("Best Value")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<CarrierComparisonCard rate={mockRate} onClick={handleClick} />);
    screen.getByRole("button").click();
    expect(handleClick).toHaveBeenCalled();
  });

  it("shows selected state", () => {
    render(<CarrierComparisonCard rate={mockRate} isSelected />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("ring-accent");
  });

  it("shows no tracking when not included", () => {
    render(<CarrierComparisonCard rate={{ ...mockRate, trackingIncluded: false }} />);
    expect(screen.getByText("No Tracking")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<CarrierComparisonCard rate={{ ...mockRate, error: "Rate unavailable" }} />);
    expect(screen.getByText("Rate unavailable")).toBeInTheDocument();
  });

  it("shows currency", () => {
    render(<CarrierComparisonCard rate={mockRate} />);
    expect(screen.getByText("USD")).toBeInTheDocument();
  });
});
