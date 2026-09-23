import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfitCalculator from "./ProfitCalculator";

vi.mock("next/link", () => ({
  default: (props: Record<string, unknown> & { children: React.ReactNode }) => <a {...props}>{props.children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

// Defaults on mount: platformFee 15%, shipping $5, ad spend $5.
// For sourcePrice 10 / sellPrice 25 that yields:
//   fee = 3.75, totalCost = 23.75, profit = 1.25, margin = 5%, roi = 5.26%, breakEven = 16.
describe("ProfitCalculator", () => {
  it("renders the header and presets", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    expect(screen.getByText("Profit Calculator")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Amazon FBA/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shopify Dropship/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eBay Resell/i })).toBeInTheDocument();
  });

  it("computes net profit, margin, ROI, and break-even from the default costs", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    expect(screen.getByText("$1.25")).toBeInTheDocument();
    expect(screen.getByText("5.0%")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(screen.getByText("16 units")).toBeInTheDocument();
    expect(screen.getByText("Low margin — optimize costs")).toBeInTheDocument();
  });

  it("recomputes results when the selling price changes", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[1], { target: { value: "50" } });

    expect(screen.getByText("$22.50")).toBeInTheDocument();
    expect(screen.getByText("45.0%")).toBeInTheDocument();
    expect(screen.getByText("1 units")).toBeInTheDocument();
    expect(screen.getByText("Excellent margin")).toBeInTheDocument();
  });

  it("recomputes results when the source price changes", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "15" } });

    expect(screen.getByText("$-3.75")).toBeInTheDocument();
    expect(screen.getByText("-15.0%")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("Low margin — optimize costs")).toBeInTheDocument();
  });

  it("applies an eBay Resell preset and updates the math", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    fireEvent.click(screen.getByRole("button", { name: /eBay Resell/i }));

    expect(screen.getByText("$5.75")).toBeInTheDocument();
    expect(screen.getByText("23.0%")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("3 units")).toBeInTheDocument();
    expect(screen.getByText("Good margin")).toBeInTheDocument();
  });

  it("applies an Amazon FBA preset", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    fireEvent.click(screen.getByRole("button", { name: /Amazon FBA/i }));

    expect(screen.getByText("$2.75")).toBeInTheDocument();
    expect(screen.getByText("11.0%")).toBeInTheDocument();
    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText("7 units")).toBeInTheDocument();
  });

  it("shows a dash break-even when the deal is unprofitable", () => {
    render(<ProfitCalculator sourcePrice={50} sellPrice={25} />);
    expect(screen.getByText("$-38.75")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("Low margin — optimize costs")).toBeInTheDocument();
  });

  it("links to the full calculator with the current inputs", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} productTitle="Earbuds" />);
    const link = screen.getByRole("link", { name: /Open Full Calculator/i });
    expect(link).toHaveAttribute(
      "href",
      "/calculator?cost=10&sell=25&fee=15&ship=5&ads=5&title=Earbuds"
    );
  });
});