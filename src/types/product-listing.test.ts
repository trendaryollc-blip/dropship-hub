import { describe, it, expect } from "vitest";
import type { ProductInput, PlatformType, GeneratedListing, ListingGenerationRequest, ListingGenerationResponse, SavedListing, ListingStats, PlatformListingConfig } from "./product-listing";

describe("product-listing types", () => {
  it("ProductInput has required fields", () => {
    const input: ProductInput = {
      title: "Test",
      description: "Desc",
      price: 10,
      category: "Cat",
      images: [],
      specifications: {},
    };
    expect(input.title).toBe("Test");
    expect(input.price).toBe(10);
  });

  it("PlatformType is a valid union", () => {
    const platforms: PlatformType[] = ["amazon", "shopify", "etsy", "ebay", "walmart"];
    expect(platforms.length).toBe(5);
  });

  it("GeneratedListing has all fields", () => {
    const listing: GeneratedListing = {
      id: "1",
      platform: "amazon",
      title: "Title",
      description: "Desc",
      bulletPoints: ["BP1"],
      seoTags: ["tag1"],
      characterCounts: { title: 5, description: 4 },
      optimizationScore: 80,
      generatedAt: new Date().toISOString(),
    };
    expect(listing.optimizationScore).toBe(80);
  });

  it("ListingGenerationRequest has product and platform", () => {
    const request: ListingGenerationRequest = {
      product: { title: "T", description: "D", price: 10, category: "C", images: [], specifications: {} },
      platform: "shopify",
    };
    expect(request.platform).toBe("shopify");
  });

  it("ListingStats tracks platform counts", () => {
    const stats: ListingStats = {
      totalGenerated: 10,
      byPlatform: { amazon: 5, shopify: 3, etsy: 1, ebay: 1, walmart: 0 },
      avgOptimizationScore: 75,
    };
    expect(stats.totalGenerated).toBe(10);
  });
});
