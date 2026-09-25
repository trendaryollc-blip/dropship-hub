import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NicheListItem from "./NicheListItem";

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
  DollarSign: () => <div />,
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
  weeklyData: null,
  demandSparkline: null,
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

describe("NicheListItem", () => {
  it("renders niche name", () => {
    render(<NicheListItem niche={mockNiche} index={0} onSelect={vi.fn()} />);
    expect(screen.getByText("Wireless Earbuds")).toBeDefined();
  });

  it("renders heat", () => {
    render(<NicheListItem niche={mockNiche} index={0} onSelect={vi.fn()} />);
    expect(screen.getByText("85")).toBeDefined();
  });

  it("renders growth", () => {
    render(<NicheListItem niche={mockNiche} index={0} onSelect={vi.fn()} />);
    expect(screen.getByText("+22%")).toBeDefined();
  });

  it("renders n/a labels when margin and growth are null", () => {
    render(
      <NicheListItem
        niche={{ ...mockNiche, avgMargin: null, growth: null, profitPerUnit: null, avgShippingDays: null, estimatedMonthlyRevenue: null }}
        index={0}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("margin n/a")).toBeDefined();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("profit n/a")).toBeDefined();
    expect(screen.getByText("shipping n/a")).toBeDefined();
    expect(screen.queryByText("+null%")).toBeNull();
    expect(screen.queryByText("$null")).toBeNull();
  });

  it("calls onSelect on click", () => {
    const onSelect = vi.fn();
    render(<NicheListItem niche={mockNiche} index={0} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Wireless Earbuds"));
    expect(onSelect).toHaveBeenCalledWith("n1");
  });
});
