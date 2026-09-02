import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MarketPulseTicker from "./MarketPulseTicker";

describe("MarketPulseTicker", () => {
  it("renders ticker items", () => {
    render(
      <MarketPulseTicker items={[
        { name: "Wireless Earbuds", platform: "AliExpress", price: 8.50, change: -3.2, sparkline: [40, 42, 38, 35, 33, 36, 34] },
        { name: "Smart LED Strip", platform: "Amazon", price: 19.99, change: 5.1, sparkline: [30, 32, 35, 38, 40, 42, 44] },
      ]} />
    );
    expect(screen.getAllByText("Wireless Earbuds").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Smart LED Strip").length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty when no items", () => {
    const { container } = render(<MarketPulseTicker items={[]} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders platform labels", () => {
    render(
      <MarketPulseTicker items={[
        { name: "Pet GPS", platform: "CJ", price: 14.80, change: 12.4, sparkline: [20, 25, 28, 32, 38, 42, 48] },
      ]} />
    );
    expect(screen.getAllByText("CJ").length).toBeGreaterThanOrEqual(1);
  });
});
