import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InlineCalculator from "./InlineCalculator";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("lucide-react", () => ({
  Calculator: () => <div />,
  ArrowUpRight: () => <div />,
}));

vi.mock("@/lib/calculations", () => ({
  calculateProfit: vi.fn(() => ({
    totalCost: 15,
    netProfit: 15,
    profitMargin: 50,
    roi: 100,
    breakEvenUnits: 1,
    revenue: 30,
    costBreakdown: [],
  })),
}));

describe("InlineCalculator", () => {
  it("renders calculator inputs", () => {
    render(<InlineCalculator />);
    expect(screen.getByText("Quick Calc")).toBeDefined();
    expect(screen.getByText("Cost ($)")).toBeDefined();
    expect(screen.getByText("Sell Price ($)")).toBeDefined();
  });

  it("calculates profit", () => {
    render(<InlineCalculator />);
    expect(screen.getByText("Profit")).toBeDefined();
    expect(screen.getByText("Margin")).toBeDefined();
    expect(screen.getByText("ROI")).toBeDefined();
  });

  it("shows margin value", () => {
    render(<InlineCalculator />);
    expect(screen.getByText("50.0%")).toBeDefined();
  });

  it("link to full calculator", () => {
    render(<InlineCalculator />);
    const link = screen.getByText("Open Full Calculator");
    expect(link.closest("a")).toHaveAttribute("href", "/calculator");
  });
});
