import { describe, it, expect } from "vitest";
import { generateListing, getPlatformConfig, validateListingForPlatform, PLATFORM_CONFIGS } from "./listing-generator";
import type { ListingGenerationRequest, PlatformType } from "@/types/product-listing";

const mockProduct = {
  title: "Premium Wireless Bluetooth Earbuds with Active Noise Cancellation",
  description: "High-quality wireless earbuds featuring advanced active noise cancellation technology. Perfect for music lovers and professionals who need focus.",
  price: 49.99,
  category: "Electronics > Audio > Earbuds",
  images: ["https://example.com/img1.jpg"],
  specifications: {
    "Battery Life": "8 hours",
    "Connectivity": "Bluetooth 5.0",
    "Noise Cancellation": "Active",
    "Water Resistance": "IPX5",
    "Weight": "5.2g per earbud",
  },
};

describe("listing-generator", () => {
  describe("getPlatformConfig", () => {
    it("returns config for amazon", () => {
      const config = getPlatformConfig("amazon");
      expect(config.platform).toBe("amazon");
      expect(config.maxLengths.title).toBe(200);
      expect(config.requirements.bulletPoints).toBe(5);
      expect(config.requirements.backendKeywords).toBe(true);
    });

    it("returns config for shopify", () => {
      const config = getPlatformConfig("shopify");
      expect(config.platform).toBe("shopify");
      expect(config.maxLengths.title).toBe(70);
      expect(config.requirements.storyDescription).toBe(true);
    });

    it("returns config for etsy", () => {
      const config = getPlatformConfig("etsy");
      expect(config.platform).toBe("etsy");
      expect(config.maxLengths.title).toBe(140);
      expect(config.requirements.storyDescription).toBe(true);
    });

    it("returns config for ebay", () => {
      const config = getPlatformConfig("ebay");
      expect(config.platform).toBe("ebay");
      expect(config.maxLengths.title).toBe(80);
      expect(config.requirements.seoTags).toBe(false);
    });

    it("returns config for walmart", () => {
      const config = getPlatformConfig("walmart");
      expect(config.platform).toBe("walmart");
      expect(config.maxLengths.title).toBe(75);
      expect(config.requirements.backendKeywords).toBe(true);
    });

    it("has configs for all platforms", () => {
      expect(Object.keys(PLATFORM_CONFIGS)).toEqual(
        expect.arrayContaining(["amazon", "shopify", "etsy", "ebay", "walmart"])
      );
    });
  });

  describe("generateListing", () => {
    const platforms: PlatformType[] = ["amazon", "shopify", "etsy", "ebay", "walmart"];

    for (const platform of platforms) {
      it(`generates listing for ${platform}`, () => {
        const request: ListingGenerationRequest = {
          product: mockProduct,
          platform,
        };
        const result = generateListing(request);

        expect(result.listing).toBeDefined();
        expect(result.listing.platform).toBe(platform);
        expect(result.listing.title).toBeTruthy();
        expect(result.listing.description).toBeTruthy();
        expect(result.listing.bulletPoints.length).toBeGreaterThan(0);
        expect(result.listing.seoTags.length).toBeGreaterThan(0);
        expect(result.listing.optimizationScore).toBeGreaterThanOrEqual(0);
        expect(result.listing.optimizationScore).toBeLessThanOrEqual(100);
        expect(result.listing.characterCounts.title).toBe(result.listing.title.length);
        expect(result.listing.characterCounts.description).toBe(result.listing.description.length);
        expect(result.listing.id).toBeTruthy();
        expect(result.listing.generatedAt).toBeTruthy();
      });
    }

    it("generates backend keywords for amazon", () => {
      const result = generateListing({ product: mockProduct, platform: "amazon" });
      expect(result.listing.backendKeywords).toBeDefined();
      expect(result.listing.backendKeywords!.length).toBeGreaterThan(0);
    });

    it("generates story description for shopify", () => {
      const result = generateListing({ product: mockProduct, platform: "shopify" });
      expect(result.listing.storyDescription).toBeDefined();
    });

    it("generates story description for etsy", () => {
      const result = generateListing({ product: mockProduct, platform: "etsy" });
      expect(result.listing.storyDescription).toBeDefined();
    });

    it("does not generate backend keywords for shopify", () => {
      const result = generateListing({ product: mockProduct, platform: "shopify" });
      expect(result.listing.backendKeywords).toBeUndefined();
    });

    it("does not generate story description for amazon", () => {
      const result = generateListing({ product: mockProduct, platform: "amazon" });
      expect(result.listing.storyDescription).toBeUndefined();
    });

    it("includes keyword suggestions", () => {
      const result = generateListing({ product: mockProduct, platform: "amazon" });
      expect(result.keywordSuggestions).toBeDefined();
      expect(result.keywordSuggestions.length).toBeGreaterThan(0);
      expect(result.keywordSuggestions[0].keyword).toBeTruthy();
      expect(result.keywordSuggestions[0].volume).toBeTruthy();
      expect(result.keywordSuggestions[0].competition).toBeTruthy();
    });

    it("includes alternatives", () => {
      const result = generateListing({ product: mockProduct, platform: "amazon" });
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
    });

    it("truncates title to platform max length", () => {
      const longProduct = { ...mockProduct, title: "A".repeat(300) };
      const result = generateListing({ product: longProduct, platform: "shopify" });
      expect(result.listing.title.length).toBeLessThanOrEqual(70);
    });

    it("truncates description to platform max length", () => {
      const longProduct = { ...mockProduct, description: "B".repeat(10000) };
      const result = generateListing({ product: longProduct, platform: "shopify" });
      expect(result.listing.description.length).toBeLessThanOrEqual(5000);
    });

    it("returns generation time", () => {
      const result = generateListing({ product: mockProduct, platform: "amazon" });
      expect(result.generationTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("validateListingForPlatform", () => {
    it("validates a correct listing", () => {
      const result = generateListing({ product: mockProduct, platform: "amazon" });
      const validation = validateListingForPlatform(result.listing);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it("detects title too long", () => {
      const result = generateListing({ product: mockProduct, platform: "shopify" });
      result.listing.title = "A".repeat(100);
      const validation = validateListingForPlatform(result.listing);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Title"))).toBe(true);
    });

    it("detects description too long", () => {
      const result = generateListing({ product: mockProduct, platform: "shopify" });
      result.listing.description = "B".repeat(6000);
      const validation = validateListingForPlatform(result.listing);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("Description"))).toBe(true);
    });

    it("detects missing bullet points for amazon", () => {
      const result = generateListing({ product: mockProduct, platform: "amazon" });
      result.listing.bulletPoints = ["Only one bullet"];
      const validation = validateListingForPlatform(result.listing);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("bullet"))).toBe(true);
    });
  });
});
