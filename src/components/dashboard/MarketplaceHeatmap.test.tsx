import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MarketplaceHeatmap from "./MarketplaceHeatmap";
import type { HeatmapCategory } from "@/types/dashboard";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => ({
  Flame: () => <div data-testid="icon-flame" />,
  TrendingUp: () => <div data-testid="icon-trending-up" />,
  TrendingDown: () => <div data-testid="icon-trending-down" />,
  Minus: () => <div data-testid="icon-minus" />,
  ArrowUpRight: () => <div data-testid="icon-arrow-up-right" />,
  ShoppingCart: () => <div data-testid="icon-shopping-cart" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  ChevronUp: () => <div data-testid="icon-chevron-up" />,
  Activity: () => <div data-testid="icon-activity" />,
}));

const makeCategory = (overrides: Partial<HeatmapCategory> = {}): HeatmapCategory => ({
  category: "Electronics",
  heat: 72,
  trend: "up",
  productCount: 1240,
  avgMargin: 35,
  topProduct: "Wireless Earbuds",
  topProductMargin: 42,
  aiInsight: "Strong demand, healthy margins",
  velocity: 8,
  weeklyData: [10, 20, 30, 40, 50, 60, 70],
  ...overrides,
});

const categories: HeatmapCategory[] = [
  makeCategory({ category: "Electronics", heat: 85, trend: "up", productCount: 1240, weeklyData: [10, 20, 30, 40, 50, 60, 70], velocity: 8 }),
  makeCategory({ category: "Fashion", heat: 60, trend: "down", productCount: 800, weeklyData: [70, 60, 50, 40, 30, 20, 10], velocity: -3 }),
  makeCategory({ category: "Home & Garden", heat: 45, trend: "stable", productCount: 320, weeklyData: [25, 30, 25, 30, 25, 30, 25], velocity: 0 }),
  makeCategory({ category: "Beauty", heat: 90, trend: "up", productCount: 560, weeklyData: [5, 15, 25, 35, 45, 55, 65], velocity: 12 }),
];

describe("MarketplaceHeatmap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders category names", () => {
    render(<MarketplaceHeatmap categories={categories} />);
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Fashion")).toBeInTheDocument();
    expect(screen.getByText("Home & Garden")).toBeInTheDocument();
    expect(screen.getByText("Beauty")).toBeInTheDocument();
  });

  it("renders heat values", () => {
    render(<MarketplaceHeatmap categories={[categories[0]]} />);
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByText("85/100")).toBeInTheDocument();
  });

  it("shows overheating count when heat >= 80", () => {
    render(<MarketplaceHeatmap categories={categories} />);
    expect(screen.getAllByText("overheating").length).toBeGreaterThan(0);
  });

  it("shows trending up count", () => {
    render(<MarketplaceHeatmap categories={categories} />);
    expect(screen.getByText("trending up")).toBeInTheDocument();
  });

  it("shows cooling count when trends are down", () => {
    render(<MarketplaceHeatmap categories={categories} />);
    expect(screen.getByText("cooling")).toBeInTheDocument();
  });

  it("renders empty state when no categories", () => {
    const { container } = render(<MarketplaceHeatmap categories={[]} />);
    expect(screen.getByText("Market Pulse")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(container.querySelector(".grid")).toHaveTextContent("");
  });

  it("renders total products count", () => {
    render(<MarketplaceHeatmap categories={categories} />);
    expect(screen.getByText("2,920")).toBeInTheDocument();
  });

  it("handles expand/collapse in HeatTile", () => {
    render(<MarketplaceHeatmap categories={[categories[0]]} />);
    const detailsButton = screen.getByText("Details");
    fireEvent.click(detailsButton);
    expect(screen.getByText("Demand score")).toBeInTheDocument();
    expect(screen.getByText("85/100")).toBeInTheDocument();
    expect(screen.getByText("Explore Electronics")).toBeInTheDocument();

    const lessButton = screen.getByText("Less");
    fireEvent.click(lessButton);
    expect(screen.queryByText("Demand score")).not.toBeInTheDocument();
  });

  it("renders weekly bar chart", () => {
    render(<MarketplaceHeatmap categories={[categories[0]]} />);
    const bars = screen.getAllByText("7-day trend");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("renders trend indicators", () => {
    render(<MarketplaceHeatmap categories={categories} />);
    expect(screen.getAllByText("up").length).toBe(2);
    expect(screen.getByText("down")).toBeInTheDocument();
    expect(screen.getByText("stable")).toBeInTheDocument();
  });

  it("renders velocity percentages", () => {
    render(<MarketplaceHeatmap categories={categories} />);
    expect(screen.getByText("+8%/wk")).toBeInTheDocument();
    expect(screen.getByText("-3%/wk")).toBeInTheDocument();
    expect(screen.getByText("+12%/wk")).toBeInTheDocument();
  });
});
