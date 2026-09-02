import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PriceComparison from "./PriceComparison";

describe("PriceComparison", () => {
  it("renders platform prices", () => {
    render(
      <PriceComparison
        platforms={[
          { platform: "Amazon", price: 29.99, url: "https://amazon.com/1", inStock: true, rating: 4.5, reviews: 1200, sparkline: [25, 27, 28, 29, 30] },
          { platform: "eBay", price: 24.99, url: "https://ebay.com/1", inStock: true, rating: 4.2, reviews: 800, sparkline: [22, 23, 24, 24, 25] },
        ]}
        listedPrice={32.99}
        productTitle="Test Product"
      />
    );
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("eBay")).toBeInTheDocument();
  });

  it("renders price comparison heading", () => {
    render(
      <PriceComparison
        platforms={[
          { platform: "Amazon", price: 29.99, url: "https://amazon.com/1", inStock: true, rating: 4.5, reviews: 1200, sparkline: [25, 27, 28, 29, 30] },
          { platform: "Walmart", price: 27.99, url: "https://walmart.com/1", inStock: true, rating: 4.0, reviews: 500, sparkline: [24, 25, 26, 27, 28] },
        ]}
        listedPrice={32.99}
      />
    );
    expect(screen.getByText("Price Comparison")).toBeInTheDocument();
  });

  it("renders empty state when no valid platforms", () => {
    render(
      <PriceComparison
        platforms={[]}
        listedPrice={0}
      />
    );
    expect(screen.getByText("Price Comparison")).toBeInTheDocument();
  });
});
