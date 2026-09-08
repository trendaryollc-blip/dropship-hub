import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ForecastChart from "./ForecastChart";

vi.mock("lucide-react", () => ({
  TrendingUp: () => <div data-testid="trending-up" />,
  TrendingDown: () => <div data-testid="trending-down" />,
  Minus: () => <div data-testid="minus" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronUp: () => <div data-testid="chevron-up" />,
  BarChart3: () => <div data-testid="bar-chart" />,
}));

const mockForecast = {
  forecast: [
    { date: "2025-01-10", actual: 100, predicted: 110, lowerBound: 95, upperBound: 125 },
    { date: "2025-01-11", actual: 120, predicted: 115, lowerBound: 100, upperBound: 130 },
    { date: "2025-01-12", actual: null, predicted: 130, lowerBound: 110, upperBound: 150 },
  ],
  summary: {
    currentTrend: "growing" as const,
    projectedWeeklyRevenue: 850,
    projectedMonthlyRevenue: 3400,
    confidenceLevel: "high" as const,
    avgDailyRevenue: 115,
    bestDay: "Monday",
    worstDay: "Sunday",
    growthRate: 12.5,
  },
  insights: ["Revenue trending upward"],
};

describe("ForecastChart", () => {
  it("renders chart title", () => {
    render(<ForecastChart forecast={null} onGenerate={vi.fn()} />);
    expect(screen.getByText("Revenue Forecast")).toBeInTheDocument();
  });

  it("renders default description when no forecast", () => {
    render(<ForecastChart forecast={null} onGenerate={vi.fn()} />);
    expect(screen.getByText("AI-powered prediction")).toBeInTheDocument();
  });

  it("renders confidence level description with forecast", () => {
    render(<ForecastChart forecast={mockForecast} onGenerate={vi.fn()} />);
    expect(screen.getByText("high confidence prediction")).toBeInTheDocument();
  });

  it("renders projected revenue when forecast provided", () => {
    render(<ForecastChart forecast={mockForecast} onGenerate={vi.fn()} />);
    expect(screen.getByText("$850")).toBeInTheDocument();
  });

  it("renders generate button when expanded with no forecast", () => {
    render(<ForecastChart forecast={null} onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByTestId("chevron-down"));
    expect(screen.getByText("Generate Revenue Forecast")).toBeInTheDocument();
  });

  it("renders SVG chart when expanded with forecast", () => {
    render(<ForecastChart forecast={mockForecast} onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByTestId("chevron-down"));
    const svgs = document.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("renders legend when forecast present and expanded", () => {
    render(<ForecastChart forecast={mockForecast} onGenerate={vi.fn()} />);
    fireEvent.click(screen.getByTestId("chevron-down"));
    expect(screen.getByText("Actual")).toBeInTheDocument();
    expect(screen.getByText("Predicted")).toBeInTheDocument();
  });
});
