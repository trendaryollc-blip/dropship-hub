import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NicheDetail from "./NicheDetail";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("lucide-react", () => ({
  TrendingUp: () => <div />,
  TrendingDown: () => <div />,
  Minus: () => <div />,
  Flame: () => <div />,
  Target: () => <div />,
  BarChart3: () => <div />,
  Shield: () => <div />,
  Zap: () => <div />,
  ArrowRight: () => <div />,
  ShoppingCart: () => <div />,
  Users: () => <div />,
  Globe: () => <div />,
  Clock: () => <div />,
  DollarSign: () => <div />,
  RotateCcw: () => <div />,
  Package: () => <div />,
  Star: () => <div />,
  MapPin: () => <div />,
  Calendar: () => <div />,
  AlertTriangle: () => <div />,
  Eye: () => <div />,
  BookmarkPlus: () => <div />,
  Sparkles: () => <div />,
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
  aiInsight: "High demand niche with good margins",
  competitionLevel: "medium" as const,
  saturation: 40,
  avgSellingPrice: 35,
  bestPlatforms: ["Amazon", "Shopify"],
  seasonality: "Year-round",
  riskLevel: "low" as const,
  topSuppliers: [
    { name: "CJ Dropshipping", badge: "gold" as const, reliability: 95, avgShippingDays: 7, price: 8.5, moq: 1, responseRate: 98 },
    { name: "AliExpress", badge: "silver" as const, reliability: 85, avgShippingDays: 12, price: 7.2, moq: 5, responseRate: 90 },
  ],
  relatedNiches: ["Bluetooth Speakers", "Phone Accessories"],
  keywords: ["earbuds", "wireless", "bluetooth"],
  estimatedMonthlyRevenue: 12500,
  profitPerUnit: 12.5,
  avgShippingDays: 8,
  avgReturnRate: 3.2,
  topProducts: [
    { id: "p1", name: "Pro Earbuds X1", image: "", sellPrice: 25, costPrice: 12, margin: 52, orders: 150, rating: 4.5, shippingDays: 7, returnRate: 2.1 },
  ],
  competition: { storeCount: 150, avgStoreRating: 4.2, priceRange: { min: 10, max: 50, avg: 35 }, topPlatforms: ["Amazon", "Shopify"], saturationLevel: "medium" as const },
  geographicDemand: [
    { country: "United States", demand: 85, avgOrderValue: 32 },
    { country: "United Kingdom", demand: 60, avgOrderValue: 28 },
  ],
  seasonalTrend: [
    { month: "Jan", demand: 50, isPeak: false },
    { month: "Nov", demand: 85, isPeak: true },
    { month: "Dec", demand: 90, isPeak: true },
  ],
};

describe("NicheDetail", () => {
  it("renders niche name", () => {
    render(<NicheDetail niche={mockNiche} />);
    expect(screen.getByText("Wireless Earbuds")).toBeDefined();
  });

  it("renders scores", () => {
    render(<NicheDetail niche={mockNiche} />);
    expect(screen.getByText("Niche Scores")).toBeDefined();
    expect(screen.getAllByText(/75/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders suppliers", () => {
    render(<NicheDetail niche={mockNiche} />);
    expect(screen.getByText("Top Suppliers for This Niche")).toBeDefined();
    expect(screen.getByText("CJ Dropshipping")).toBeDefined();
    expect(screen.getByText("AliExpress")).toBeDefined();
  });

  it("renders related niches", () => {
    render(<NicheDetail niche={mockNiche} />);
    expect(screen.getByText("Related Niches")).toBeDefined();
    expect(screen.getByText("Bluetooth Speakers")).toBeDefined();
    expect(screen.getByText("Phone Accessories")).toBeDefined();
  });
});
