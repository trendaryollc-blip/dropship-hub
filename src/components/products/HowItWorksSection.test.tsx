import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HowItWorksSection from "./HowItWorksSection";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

describe("HowItWorksSection", () => {
  it("renders the section heading", () => {
    render(<HowItWorksSection />);
    expect(screen.getByRole("heading", { name: "How It Works" })).toBeInTheDocument();
  });

  it("renders the three steps in order", () => {
    render(<HowItWorksSection />);
    expect(screen.getByRole("heading", { name: "Search Across Platforms" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Compare & Analyze" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Source & Sell" })).toBeInTheDocument();
    expect(screen.getByText("STEP 1")).toBeInTheDocument();
    expect(screen.getByText("STEP 2")).toBeInTheDocument();
    expect(screen.getByText("STEP 3")).toBeInTheDocument();
  });

  it("describes what each step does", () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByText("Find products from Amazon, eBay, AliExpress, and more in one search")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Compare prices, margins, and demand data to find winning products")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Connect with verified suppliers and start selling with confidence")
    ).toBeInTheDocument();
  });
});
