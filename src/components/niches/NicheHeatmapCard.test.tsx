import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NicheHeatmapCard from "./NicheHeatmapCard";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("lucide-react", () => ({
  TrendingUp: () => <div />,
  TrendingDown: () => <div />,
  Minus: () => <div />,
  Flame: () => <div />,
  ArrowRight: () => <div />,
  Target: () => <div />,
  Clock: () => <div />,
  BookmarkPlus: () => <div />,
  Sparkles: () => <div />,
  GitCompare: () => <div />,
}));

const mockNiche = {
  id: "n1",
  name: "Wireless Earbuds",
  icon: "headphones",
  image: "/earbuds.jpg",
  category: "Electronics",
  heat: 85,
  productCount: 1200,
  avgMargin: 35,
  growth: 22,
  trend: "up" as const,
  trendDirection: "rising" as const,
  weeklyData: [10, 20, 30, 40, 50, 60, 70],
  demandSparkline: [10, 20, 30, 40, 50],
  scores: { demand: 80, profit: 70, competition: 60, trend: 75, seasonality: 50 },
  overallScore: 75,
  grade: "A" as const,
  topProduct: "Pro Earbuds X1",
  topProductPrice: 15,
  topProductMargin: 45,
  aiInsight: "High demand niche",
  competitionLevel: "medium" as const,
  saturation: 40,
  avgSellingPrice: 35,
  bestPlatforms: ["Amazon"],
  seasonality: "Year-round",
  riskLevel: "low" as const,
  topSuppliers: [],
  relatedNiches: [],
  keywords: [],
  estimatedMonthlyRevenue: 12500,
  profitPerUnit: 12.5,
  avgShippingDays: 8,
  avgReturnRate: 3.2,
  topProducts: [],
  competition: { storeCount: 150, avgStoreRating: 4.2, priceRange: { min: 10, max: 50, avg: 35 }, topPlatforms: ["Amazon"], saturationLevel: "medium" as const },
  geographicDemand: [],
  seasonalTrend: [],
};

describe("NicheHeatmapCard", () => {
  it("renders niche name", () => {
    render(<NicheHeatmapCard niche={mockNiche} index={0} onSelect={vi.fn()} />);
    expect(screen.getByText("Wireless Earbuds")).toBeDefined();
  });

  it("renders heat score", () => {
    render(<NicheHeatmapCard niche={mockNiche} index={0} onSelect={vi.fn()} />);
    expect(screen.getByText("85")).toBeDefined();
  });

  it("renders grade", () => {
    render(<NicheHeatmapCard niche={mockNiche} index={0} onSelect={vi.fn()} />);
    expect(screen.getByText("A")).toBeDefined();
  });

  it("calls onSelect on click", () => {
    const onSelect = vi.fn();
    const { container } = render(<NicheHeatmapCard niche={mockNiche} index={0} onSelect={onSelect} />);
    const card = container.firstChild as HTMLElement;
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith("n1");
  });
});
