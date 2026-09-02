import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MarketplaceHeatmap from "./MarketplaceHeatmap";
import type { HeatmapCategory } from "@/types/dashboard";

const makeCategory = (overrides: Partial<HeatmapCategory> = {}): HeatmapCategory => ({
  category: "Electronics",
  heat: 72,
  productCount: 150,
  avgMargin: 35,
  trend: "up",
  weeklyData: [10, 20, 15, 30, 25, 40, 35],
  topProduct: "Wireless Earbuds",
  topProductMargin: 42,
  aiInsight: "Strong demand in wireless audio accessories.",
  velocity: 12,
  ...overrides,
});

describe("MarketplaceHeatmap", () => {
  it("renders category names", () => {
    const cats = [makeCategory({ category: "Electronics" }), makeCategory({ category: "Fashion" })];
    render(<MarketplaceHeatmap categories={cats} />);
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Fashion")).toBeInTheDocument();
  });

  it("renders Market Pulse heading", () => {
    render(<MarketplaceHeatmap categories={[makeCategory()]} />);
    expect(screen.getByText("Market Pulse")).toBeInTheDocument();
  });

  it("renders Live badge", () => {
    render(<MarketplaceHeatmap categories={[makeCategory()]} />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders product count in overview", () => {
    render(<MarketplaceHeatmap categories={[makeCategory({ productCount: 150 })]} />);
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("renders top product names", () => {
    render(<MarketplaceHeatmap categories={[makeCategory({ topProduct: "Smart Watch" })]} />);
    expect(screen.getByText("Smart Watch")).toBeInTheDocument();
  });

  it("renders AI insight text", () => {
    render(<MarketplaceHeatmap categories={[makeCategory({ aiInsight: "Hot market." })]} />);
    expect(screen.getByText("Hot market.")).toBeInTheDocument();
  });

  it("renders 7-day trend label", () => {
    render(<MarketplaceHeatmap categories={[makeCategory()]} />);
    expect(screen.getByText("7-day trend")).toBeInTheDocument();
  });

  it("renders Details expand button", () => {
    render(<MarketplaceHeatmap categories={[makeCategory()]} />);
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("expands to show demand score on click", () => {
    render(<MarketplaceHeatmap categories={[makeCategory({ heat: 72 })]} />);
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByText("Demand score")).toBeInTheDocument();
    expect(screen.getByText("72/100")).toBeInTheDocument();
  });

  it("renders category with null weeklyData without crashing", () => {
    render(<MarketplaceHeatmap categories={[makeCategory({ weeklyData: null as unknown as number[] })]} />);
    expect(screen.getByText("Electronics")).toBeInTheDocument();
  });

  it("renders empty categories list", () => {
    const { container } = render(<MarketplaceHeatmap categories={[]} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders View all link for niches in expanded detail", () => {
    render(<MarketplaceHeatmap categories={[makeCategory({ category: "Toys" })]} />);
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByText(/Explore Toys/)).toBeInTheDocument();
  });
});
