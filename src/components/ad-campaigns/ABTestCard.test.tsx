import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ABTestCard from "./ABTestCard";

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

const mockTest = {
  id: "t1",
  campaignId: "c1",
  name: "Headline A/B Test",
  status: "running",
  creativeAId: "crA",
  creativeBId: "crB",
  splitPercent: 50,
  startDate: "2025-01-01",
  results: {
    aMetrics: { impressions: 1000, clicks: 50, conversions: 5, ctr: 5, conversionRate: 10 },
    bMetrics: { impressions: 1000, clicks: 45, conversions: 3, ctr: 4.5, conversionRate: 6.67 },
    statisticallySignificant: false,
    pValue: 0.15,
  },
};

const mockTestWithWinner = {
  ...mockTest,
  id: "t2",
  status: "completed",
  winnerId: "crA",
  winnerConfidence: 0.95,
  results: {
    ...mockTest.results,
    statisticallySignificant: true,
  },
};

describe("ABTestCard", () => {
  it("renders test name and status", () => {
    render(<ABTestCard test={mockTest} />);
    expect(screen.getByText("Headline A/B Test")).toBeDefined();
    expect(screen.getByText("running")).toBeDefined();
  });

  it("renders split percentage", () => {
    render(<ABTestCard test={mockTest} />);
    expect(screen.getByText(/Split:.*50.*\/.*50/)).toBeDefined();
  });

  it("renders variant metrics when results exist", () => {
    render(<ABTestCard test={mockTest} />);
    expect(screen.getByText("5.0%")).toBeDefined();
    expect(screen.getByText("4.5%")).toBeDefined();
  });

  it("renders statistical significance status", () => {
    render(<ABTestCard test={mockTest} />);
    expect(screen.getByText("Not yet significant")).toBeDefined();
  });

  it("renders winner when test is completed", () => {
    render(<ABTestCard test={mockTestWithWinner} />);
    expect(screen.getByText("completed")).toBeDefined();
    expect(screen.getByText("95% confidence")).toBeDefined();
  });

  it("renders collecting data message when no results", () => {
    const testNoResults = { ...mockTest, results: undefined };
    render(<ABTestCard test={testNoResults} />);
    expect(screen.getByText("Collecting data...")).toBeDefined();
  });
});
