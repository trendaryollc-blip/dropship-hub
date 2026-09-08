import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TrendVelocityCard from "./TrendVelocityCard";
import type { TrendVelocityResult } from "@/types/product-validation";

vi.mock("lucide-react", () => ({
  TrendingUp: () => <div data-testid="trending-up" />,
  TrendingDown: () => <div data-testid="trending-down" />,
  Minus: () => <div data-testid="minus" />,
  Zap: () => <div data-testid="zap" />,
  AlertTriangle: () => <div data-testid="alert-triangle" />,
}));

const mockData: TrendVelocityResult = {
  score: 82,
  velocity: 25,
  acceleration: 10,
  phase: "growth",
  weeklyGrowthRates: [5, 8, 12, 15, 20, 25],
  insight: "Strong growth trajectory",
};

describe("TrendVelocityCard", () => {
  it("renders title and subtitle", () => {
    render(<TrendVelocityCard data={mockData} />);
    expect(screen.getByText("Trend Velocity")).toBeInTheDocument();
    expect(screen.getByText("How fast is it growing")).toBeInTheDocument();
  });

  it("renders velocity percentage", () => {
    render(<TrendVelocityCard data={mockData} />);
    expect(screen.getByText("+25%")).toBeInTheDocument();
  });

  it("renders phase label", () => {
    render(<TrendVelocityCard data={mockData} />);
    expect(screen.getByText("Growth")).toBeInTheDocument();
  });

  it("renders acceleration", () => {
    render(<TrendVelocityCard data={mockData} />);
    expect(screen.getByText("+10%")).toBeInTheDocument();
  });

  it("renders score", () => {
    render(<TrendVelocityCard data={mockData} />);
    expect(screen.getByText("82/100")).toBeInTheDocument();
  });

  it("renders insight", () => {
    render(<TrendVelocityCard data={mockData} />);
    expect(screen.getByText("Strong growth trajectory")).toBeInTheDocument();
  });

  it("renders weekly growth bars", () => {
    render(<TrendVelocityCard data={mockData} />);
    expect(screen.getByText("Weekly Growth Trend")).toBeInTheDocument();
  });

  it("shows deceleration warning when acceleration < -5", () => {
    render(<TrendVelocityCard data={{ ...mockData, acceleration: -10 }} />);
    expect(screen.getByText(/Growth is decelerating/)).toBeInTheDocument();
  });

  it("hides deceleration warning when acceleration >= -5", () => {
    render(<TrendVelocityCard data={{ ...mockData, acceleration: -3 }} />);
    expect(screen.queryByText(/Growth is decelerating/)).not.toBeInTheDocument();
  });

  it("renders negative velocity with minus prefix", () => {
    render(<TrendVelocityCard data={{ ...mockData, velocity: -15 }} />);
    expect(screen.getByText("-15%")).toBeInTheDocument();
  });

  it("renders emerging phase", () => {
    render(<TrendVelocityCard data={{ ...mockData, phase: "emerging" }} />);
    expect(screen.getByText("Emerging")).toBeInTheDocument();
  });

  it("renders declining phase", () => {
    render(<TrendVelocityCard data={{ ...mockData, phase: "declining" }} />);
    expect(screen.getByText("Declining")).toBeInTheDocument();
  });

  it("hides weekly trend when no growth rates", () => {
    render(<TrendVelocityCard data={{ ...mockData, weeklyGrowthRates: [] }} />);
    expect(screen.queryByText("Weekly Growth Trend")).not.toBeInTheDocument();
  });

  it("renders required icons", () => {
    render(<TrendVelocityCard data={mockData} />);
    expect(screen.getByTestId("zap")).toBeInTheDocument();
  });
});
