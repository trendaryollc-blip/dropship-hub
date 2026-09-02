import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TrendingProducts from "./TrendingProducts";
import type { TrendingProduct } from "@/types/dashboard";

const makeProduct = (overrides: Partial<TrendingProduct> = {}): TrendingProduct => ({
  name: "Wireless Earbuds Pro",
  platform: "AliExpress",
  price: 12.99,
  sellPrice: 32.99,
  profit: 20,
  margin: 61,
  trend: 15,
  sparkline: [10, 15, 20, 25, 30, 35, 40],
  confidence: 87,
  whyTrending: "High demand in audio accessories.",
  demandLevel: "high",
  competitionLevel: "medium",
  supplierReliability: 92,
  monthlyVolume: 1500,
  shippingDays: "7-15",
  sourceUrl: "https://example.com",
  competitors: [{ name: "Competitor A", price: 14.99 }],
  listingSuggestion: { title: "Premium Wireless Earbuds", description: "High-quality audio." },
  ...overrides,
});

describe("TrendingProducts", () => {
  it("renders trending products heading", () => {
    render(<TrendingProducts products={[makeProduct()]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("Trending Products")).toBeInTheDocument();
  });

  it("renders product count badge", () => {
    render(<TrendingProducts products={[makeProduct(), makeProduct({ name: "Product 2" })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("2 hot")).toBeInTheDocument();
  });

  it("renders product names", () => {
    render(<TrendingProducts products={[makeProduct()]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("Wireless Earbuds Pro")).toBeInTheDocument();
  });

  it("renders product prices", () => {
    render(<TrendingProducts products={[makeProduct({ price: 25.50 })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("$25.50")).toBeInTheDocument();
  });

  it("renders demand level badges", () => {
    render(<TrendingProducts products={[makeProduct({ demandLevel: "high" })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("High demand")).toBeInTheDocument();
  });

  it("renders competition level badges", () => {
    render(<TrendingProducts products={[makeProduct({ competitionLevel: "low" })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("Low comp")).toBeInTheDocument();
  });

  it("renders margin percentage", () => {
    render(<TrendingProducts products={[makeProduct({ margin: 61 })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("Margin 61%")).toBeInTheDocument();
  });

  it("renders AI Score", () => {
    render(<TrendingProducts products={[makeProduct({ confidence: 87 })]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("calls onAddCompare when compare button clicked", () => {
    const onAddCompare = vi.fn();
    render(<TrendingProducts products={[makeProduct()]} onAddCompare={onAddCompare} />);
    const addButtons = screen.getAllByTitle("Add to compare");
    fireEvent.click(addButtons[0]);
    expect(onAddCompare).toHaveBeenCalled();
  });

  it("expands to show product details on click", () => {
    render(<TrendingProducts products={[makeProduct()]} onAddCompare={vi.fn()} />);
    fireEvent.click(screen.getByText("Wireless Earbuds Pro"));
    expect(screen.getByText("Monthly Vol")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("shows listing suggestion when expanded", () => {
    render(<TrendingProducts products={[makeProduct()]} onAddCompare={vi.fn()} />);
    fireEvent.click(screen.getByText("Wireless Earbuds Pro"));
    expect(screen.getByText("Premium Wireless Earbuds")).toBeInTheDocument();
  });

  it("shows view full analysis link when expanded", () => {
    render(<TrendingProducts products={[makeProduct()]} onAddCompare={vi.fn()} />);
    fireEvent.click(screen.getByText("Wireless Earbuds Pro"));
    expect(screen.getByText("View Full Analysis")).toBeInTheDocument();
  });

  it("renders View all link", () => {
    render(<TrendingProducts products={[makeProduct()]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("View all")).toBeInTheDocument();
  });

  it("renders empty product list", () => {
    render(<TrendingProducts products={[]} onAddCompare={vi.fn()} />);
    expect(screen.getByText("Trending Products")).toBeInTheDocument();
    expect(screen.getByText("0 hot")).toBeInTheDocument();
  });
});
