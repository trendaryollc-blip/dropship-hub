import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GoldenScoreBoard from "./GoldenScoreBoard";
import type { GoldenProductResult } from "@/types/product-validation";

vi.mock("lucide-react", () => ({
  Trophy: () => <div data-testid="trophy" />,
  Star: () => <div data-testid="star" />,
  AlertCircle: () => <div data-testid="alert-circle" />,
  CheckCircle2: () => <div data-testid="check-circle" />,
  XCircle: () => <div data-testid="x-circle" />,
}));

const mockData: GoldenProductResult = {
  score: 85,
  rank: "A",
  verdict: "Strong product with good margins",
  overallInsight: "This product has excellent potential",
  actionItems: ["Improve supplier reliability", "Increase ad spend"],
  criteria: [
    { name: "Trend Velocity", score: 90, weight: 0.15, contribution: 13.5, status: "excellent" },
    { name: "Saturation", score: 60, weight: 0.1, contribution: 6, status: "good" },
    { name: "Profit Margin", score: 75, weight: 0.2, contribution: 15, status: "average" },
    { name: "Seasonal Demand", score: 40, weight: 0.1, contribution: 4, status: "poor" },
  ],
};

describe("GoldenScoreBoard", () => {
  it("renders score out of 100", () => {
    render(<GoldenScoreBoard data={mockData} />);
    expect(screen.getByText("85/100")).toBeInTheDocument();
  });

  it("renders rank letter and label", () => {
    render(<GoldenScoreBoard data={mockData} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("A-Tier")).toBeInTheDocument();
  });

  it("renders verdict", () => {
    render(<GoldenScoreBoard data={mockData} />);
    expect(screen.getByText("Strong product with good margins")).toBeInTheDocument();
  });

  it("renders criteria names", () => {
    render(<GoldenScoreBoard data={mockData} />);
    expect(screen.getByText("Trend Velocity")).toBeInTheDocument();
    expect(screen.getByText("Saturation")).toBeInTheDocument();
    expect(screen.getByText("Profit Margin")).toBeInTheDocument();
    expect(screen.getByText("Seasonal Demand")).toBeInTheDocument();
  });

  it("renders criteria scores", () => {
    render(<GoldenScoreBoard data={mockData} />);
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
  });

  it("renders action items", () => {
    render(<GoldenScoreBoard data={mockData} />);
    expect(screen.getByText("Improve supplier reliability")).toBeInTheDocument();
    expect(screen.getByText("Increase ad spend")).toBeInTheDocument();
  });

  it("renders overall insight", () => {
    render(<GoldenScoreBoard data={mockData} />);
    expect(screen.getByText("This product has excellent potential")).toBeInTheDocument();
  });

  it("renders title and subtitle", () => {
    render(<GoldenScoreBoard data={mockData} />);
    expect(screen.getByText("Golden Product Score")).toBeInTheDocument();
    expect(screen.getByText("10-criteria weighted analysis")).toBeInTheDocument();
  });

  it("hides action items when empty", () => {
    render(<GoldenScoreBoard data={{ ...mockData, actionItems: [] }} />);
    expect(screen.queryByText("Action Items")).not.toBeInTheDocument();
  });

  it("renders all required icons", () => {
    render(<GoldenScoreBoard data={mockData} />);
    expect(screen.getByTestId("trophy")).toBeInTheDocument();
  });

  it("renders S rank with correct color", () => {
    render(<GoldenScoreBoard data={{ ...mockData, rank: "S", score: 95 }} />);
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("S-Tier")).toBeInTheDocument();
  });

  it("renders D rank", () => {
    render(<GoldenScoreBoard data={{ ...mockData, rank: "D", score: 25 }} />);
    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.getByText("D-Tier")).toBeInTheDocument();
  });
});
