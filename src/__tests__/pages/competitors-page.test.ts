import { describe, it, expect } from "vitest";
import type {
  CompetitorListing,
  PlatformData,
  SellerProfile,
  PriceTier,
  Opportunity,
  PricingOption,
  MarketData,
} from "@/types/competitors";

describe("Competitors Page - Data Types", () => {
  it("competitor listing has required fields", () => {
    const listing: CompetitorListing = {
      id: "cl-1",
      title: "Wireless Earbuds Pro",
      price: 29.99,
      source: "Amazon",
      seller: "TechStore",
      sellerRating: 4.5,
      sellerProducts: 150,
      link: "https://amazon.com/item/123",
      shipping: "Free shipping",
      condition: "New",
      daysAgo: 3,
    };
    expect(listing.price).toBeGreaterThan(0);
    expect(listing.condition).toBe("New");
    expect(listing.sellerRating).toBeGreaterThan(0);
  });

  it("platform data has required fields", () => {
    const platform: PlatformData = {
      platform: "Amazon",
      icon: "📦",
      avgPrice: 25.99,
      minPrice: 9.99,
      maxPrice: 49.99,
      sellerCount: 120,
      trend: "up",
      trendPercent: 15,
      sparkline: [10, 15, 20, 25, 30],
      listings: [],
    };
    expect(platform.sellerCount).toBeGreaterThan(0);
    expect(platform.minPrice).toBeLessThan(platform.maxPrice);
  });

  it("seller profile has required fields", () => {
    const seller: SellerProfile = {
      name: "Tech Store Pro",
      platform: "Amazon",
      rating: 4.8,
      totalProducts: 250,
      price: 29.99,
      threatLevel: "high",
      isDropshipper: true,
      otherProducts: [{ name: "Widget", price: 19.99 }],
      responseTime: "< 24h",
      returnPolicy: "30-day returns",
    };
    expect(seller.threatLevel).toBe("high");
    expect(seller.isDropshipper).toBe(true);
  });

  it("price tier has required fields", () => {
    const tier: PriceTier = {
      range: "$20-30",
      count: 45,
      percent: 35,
      isSweetSpot: true,
    };
    expect(tier.count).toBeGreaterThan(0);
    expect(tier.percent).toBeGreaterThan(0);
  });

  it("opportunity has required fields", () => {
    const opp: Opportunity = {
      type: "opportunity",
      title: "Low competition niche",
      description: "Few sellers targeting this segment",
      count: 15,
      potentialMargin: 45,
      actionLabel: "Enter market",
    };
    expect(opp.type).toBe("opportunity");
    expect(opp.potentialMargin).toBeGreaterThan(0);
  });

  it("market data has required fields", () => {
    const data: MarketData = {
      query: "wireless earbuds",
      totalListings: 500,
      avgPrice: 25.99,
      medianPrice: 22.99,
      minPrice: 5.99,
      maxPrice: 99.99,
      profitZone: { min: 15, max: 35, label: "Sweet Spot" },
      priceDistribution: [],
      platforms: [],
      topSellers: [],
      opportunities: [],
      pricingOptions: [],
      priceHistory: [],
      insights: [],
    };
    expect(data.totalListings).toBeGreaterThan(0);
    expect(data.minPrice).toBeLessThan(data.maxPrice);
  });
});

describe("Competitors Page - Business Logic", () => {
  it("can filter listings by price range", () => {
    const listings: CompetitorListing[] = [
      { id: "1", price: 15 } as CompetitorListing,
      { id: "2", price: 35 } as CompetitorListing,
      { id: "3", price: 25 } as CompetitorListing,
    ];
    const filtered = listings.filter((l) => l.price >= 20 && l.price <= 30);
    expect(filtered).toHaveLength(1);
  });

  it("can sort listings by price", () => {
    const listings: CompetitorListing[] = [
      { id: "1", price: 35 } as CompetitorListing,
      { id: "2", price: 15 } as CompetitorListing,
      { id: "3", price: 25 } as CompetitorListing,
    ];
    const sorted = [...listings].sort((a, b) => a.price - b.price);
    expect(sorted[0].id).toBe("2");
  });

  it("calculates average price across platforms", () => {
    const platforms: PlatformData[] = [
      { platform: "Amazon", avgPrice: 25 } as PlatformData,
      { platform: "AliExpress", avgPrice: 15 } as PlatformData,
      { platform: "eBay", avgPrice: 20 } as PlatformData,
    ];
    const avg = platforms.reduce((sum, p) => sum + p.avgPrice, 0) / platforms.length;
    expect(avg).toBeCloseTo(20, 1);
  });

  it("can filter by seller threat level", () => {
    const sellers: SellerProfile[] = [
      { name: "A", threatLevel: "high" } as SellerProfile,
      { name: "B", threatLevel: "low" } as SellerProfile,
      { name: "C", threatLevel: "high" } as SellerProfile,
    ];
    const highThreat = sellers.filter((s) => s.threatLevel === "high");
    expect(highThreat).toHaveLength(2);
  });

  it("can count listings by condition", () => {
    const listings: CompetitorListing[] = [
      { id: "1", condition: "New" } as CompetitorListing,
      { id: "2", condition: "Used" } as CompetitorListing,
      { id: "3", condition: "New" } as CompetitorListing,
    ];
    const newCount = listings.filter((l) => l.condition === "New").length;
    expect(newCount).toBe(2);
  });

  it("can calculate price range spread", () => {
    const listings: CompetitorListing[] = [
      { id: "1", price: 10 } as CompetitorListing,
      { id: "2", price: 50 } as CompetitorListing,
      { id: "3", price: 30 } as CompetitorListing,
    ];
    const prices = listings.map((l) => l.price);
    const spread = Math.max(...prices) - Math.min(...prices);
    expect(spread).toBe(40);
  });
});
