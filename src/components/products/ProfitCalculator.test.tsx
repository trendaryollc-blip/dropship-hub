import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfitCalculator from "./ProfitCalculator";

vi.mock("next/link", () => ({
  default: (props: any) => <a {...props}>{props.children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

describe("ProfitCalculator", () => {
  it("renders Profit Calculator heading", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    expect(screen.getByText("Profit Calculator")).toBeInTheDocument();
  });

  it("displays initial net profit", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    expect(screen.getByText("Net Profit")).toBeInTheDocument();
  });

  it("displays ROI and Break Even", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    expect(screen.getByText("ROI")).toBeInTheDocument();
    expect(screen.getByText("Break Even")).toBeInTheDocument();
  });

  it("shows preset buttons", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    expect(screen.getByText("Amazon FBA")).toBeInTheDocument();
    expect(screen.getByText("Shopify Dropship")).toBeInTheDocument();
    expect(screen.getByText("eBay Resell")).toBeInTheDocument();
  });

  it("shows margin percentage", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    expect(screen.getByText("Profit Margin")).toBeInTheDocument();
  });

  it("renders Open Full Calculator link", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    expect(screen.getByText("Open Full Calculator")).toBeInTheDocument();
  });

  it("shows Source Price and Selling Price labels", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    expect(screen.getByText("Source Price")).toBeInTheDocument();
    expect(screen.getByText("Selling Price")).toBeInTheDocument();
  });

  it("shows expense labels", () => {
    render(<ProfitCalculator sourcePrice={10} sellPrice={25} />);
    expect(screen.getByText("Platform Fee (%)")).toBeInTheDocument();
    expect(screen.getByText("Shipping Cost")).toBeInTheDocument();
    expect(screen.getByText("Ad Spend per Sale")).toBeInTheDocument();
  });
});
