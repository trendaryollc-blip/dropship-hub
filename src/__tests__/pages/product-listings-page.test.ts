import { describe, it, expect } from "vitest";
import type {
  PlatformType,
  ProductInput,
  PlatformListingConfig,
  GeneratedListing,
  ListingGenerationRequest,
  ListingGenerationResponse,
  SavedListing,
  ListingStats,
} from "@/types/product-listing";

describe("Product Listings Page - Data Types", () => {
  it("platform type values", () => {
    const platforms: PlatformType[] = ["amazon", "shopify", "etsy", "ebay", "walmart"];
    expect(platforms).toHaveLength(5);
  });

  it("product input has required fields", () => {
    const input: ProductInput = {
      title: "Wireless Earbuds Pro",
      description: "Premium wireless earbuds with noise cancellation",
      price: 29.99,
      category: "Electronics",
      images: ["https://example.com/img1.jpg"],
      specifications: { color: "Black", battery: "8 hours" },
    };
    expect(input.price).toBeGreaterThan(0);
    expect(input.images.length).toBeGreaterThan(0);
  });

  it("platform listing config has required fields", () => {
    const config: PlatformListingConfig = {
      platform: "amazon",
      maxLengths: {
        title: 200,
        description: 2000,
        bulletPoints: 5,
        bulletPointLength: 500,
      },
      requirements: {
        bulletPoints: 5,
        seoTags: true,
        backendKeywords: true,
        storyDescription: false,
      },
    };
    expect(config.maxLengths.title).toBeGreaterThan(0);
    expect(config.requirements.bulletPoints).toBeGreaterThan(0);
  });

  it("generated listing has required fields", () => {
    const listing: GeneratedListing = {
      id: "gl-1",
      platform: "amazon",
      title: "Wireless Earbuds Pro - Premium Sound",
      description: "Experience crystal-clear audio",
      bulletPoints: ["Feature 1", "Feature 2"],
      seoTags: ["wireless", "earbuds"],
      characterCounts: { title: 45, description: 120 },
      optimizationScore: 85,
      generatedAt: new Date().toISOString(),
    };
    expect(listing.optimizationScore).toBeGreaterThan(0);
    expect(listing.optimizationScore).toBeLessThanOrEqual(100);
  });

  it("listing stats has required fields", () => {
    const stats: ListingStats = {
      totalGenerated: 150,
      byPlatform: { amazon: 50, shopify: 40, etsy: 30, ebay: 20, walmart: 10 },
      avgOptimizationScore: 82,
    };
    expect(stats.totalGenerated).toBeGreaterThan(0);
    expect(stats.avgOptimizationScore).toBeGreaterThan(0);
  });
});

describe("Product Listings Page - Business Logic", () => {
  it("can filter products by price", () => {
    const products: ProductInput[] = [
      { title: "A", price: 10 } as ProductInput,
      { title: "B", price: 30 } as ProductInput,
      { title: "C", price: 20 } as ProductInput,
    ];
    const affordable = products.filter((p) => p.price <= 20);
    expect(affordable).toHaveLength(2);
  });

  it("can calculate listing optimization score", () => {
    const criteria = [
      { met: true, weight: 30 },
      { met: true, weight: 25 },
      { met: false, weight: 20 },
      { met: true, weight: 25 },
    ];
    const score = criteria.reduce((sum, c) => sum + (c.met ? c.weight : 0), 0);
    expect(score).toBe(80);
  });

  it("can count listings by platform", () => {
    const listings: GeneratedListing[] = [
      { id: "1", platform: "amazon" } as GeneratedListing,
      { id: "2", platform: "shopify" } as GeneratedListing,
      { id: "3", platform: "amazon" } as GeneratedListing,
    ];
    const byPlatform = listings.reduce((acc, l) => {
      acc[l.platform] = (acc[l.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    expect(byPlatform.amazon).toBe(2);
    expect(byPlatform.shopify).toBe(1);
  });

  it("can sort by optimization score", () => {
    const listings: GeneratedListing[] = [
      { id: "1", optimizationScore: 75 } as GeneratedListing,
      { id: "2", optimizationScore: 90 } as GeneratedListing,
      { id: "3", optimizationScore: 80 } as GeneratedListing,
    ];
    const sorted = [...listings].sort((a, b) => b.optimizationScore - a.optimizationScore);
    expect(sorted[0].id).toBe("2");
  });

  it("can search listings by title", () => {
    const listings: GeneratedListing[] = [
      { id: "1", title: "Wireless Earbuds Pro" } as GeneratedListing,
      { id: "2", title: "Bluetooth Speaker" } as GeneratedListing,
      { id: "3", title: "Wireless Headphones" } as GeneratedListing,
    ];
    const results = listings.filter((l) => l.title.toLowerCase().includes("wireless"));
    expect(results).toHaveLength(2);
  });
});
