import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlatformBreakdown from "./PlatformBreakdown";
import type { PlatformData } from "@/types/competitors";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("lucide-react", () => ({
  TrendingUp: () => <div data-testid="trending-up" />,
  TrendingDown: () => <div data-testid="trending-down" />,
  Minus: () => <div data-testid="minus" />,
  ExternalLink: () => <div data-testid="external-link" />,
  X: () => <div data-testid="x" />,
  Star: () => <div data-testid="star" />,
}));

const mockPlatforms: PlatformData[] = [
  {
    platform: "Amazon",
    icon: "🛒",
    avgPrice: 22.5,
    minPrice: 8.99,
    maxPrice: 45.0,
    sellerCount: 30,
    trend: "up",
    trendPercent: 12,
    sparkline: [10, 12, 14, 13, 16, 18, 20],
    listings: [
      { id: "l1", title: "Wireless Mouse A", price: 15.99, source: "amazon", seller: "TechDeals", sellerRating: 4.5, sellerProducts: 200, link: "#", shipping: "Free", condition: "New", daysAgo: 2 },
      { id: "l2", title: "Wireless Mouse B", price: 22.99, source: "amazon", seller: "GadgetWorld", sellerRating: 4.2, sellerProducts: 150, link: "#", shipping: "$3.99", condition: "New", daysAgo: 5 },
    ],
  },
  {
    platform: "eBay",
    icon: "🏷️",
    avgPrice: 18.0,
    minPrice: 6.99,
    maxPrice: 35.0,
    sellerCount: 20,
    trend: "down",
    trendPercent: -5,
    sparkline: [20, 18, 17, 19, 16, 15, 14],
    listings: [
      { id: "l3", title: "Budget Mouse", price: 9.99, source: "ebay", seller: "ValueShop", sellerRating: 4.0, sellerProducts: 80, link: "#", shipping: "Free", condition: "New", daysAgo: 1 },
    ],
  },
];

describe("PlatformBreakdown", () => {
  it("renders heading", () => {
    render(<PlatformBreakdown platforms={mockPlatforms} />);
    expect(screen.getByText("Platform Breakdown")).toBeInTheDocument();
  });

  it("renders platform names", () => {
    render(<PlatformBreakdown platforms={mockPlatforms} />);
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("eBay")).toBeInTheDocument();
  });

  it("displays average prices for platforms", () => {
    render(<PlatformBreakdown platforms={mockPlatforms} />);
    expect(screen.getByText("$22.50")).toBeInTheDocument();
    expect(screen.getByText("$18.00")).toBeInTheDocument();
  });

  it("displays price ranges", () => {
    render(<PlatformBreakdown platforms={mockPlatforms} />);
    expect(screen.getByText("$8.99 - $45.00")).toBeInTheDocument();
    expect(screen.getByText("$6.99 - $35.00")).toBeInTheDocument();
  });

  it("opens listing modal on platform click", () => {
    render(<PlatformBreakdown platforms={mockPlatforms} />);
    fireEvent.click(screen.getByText("Amazon"));
    expect(screen.getByText("Amazon Listings")).toBeInTheDocument();
    expect(screen.getByText("Wireless Mouse A")).toBeInTheDocument();
  });
});
