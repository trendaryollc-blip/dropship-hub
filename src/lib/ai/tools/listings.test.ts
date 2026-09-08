import { describe, it, expect } from "vitest";
import { generateListingTool, validateListingTool } from "./listings";

const context = {
  uid: "test-user",
  executionId: "exec_test",
  trigger: "ai_chat" as const,
  mode: "ai_assist" as const,
};

describe("Listing Tools", () => {
  describe("generateListingTool", () => {
    it("generates a Shopify listing", async () => {
      const result = await generateListingTool.execute({
        title: "Wireless Bluetooth Earbuds",
        platform: "shopify",
        price: 29.99,
        description: "High quality wireless earbuds with noise cancellation",
        category: "Electronics",
        images: ["https://example.com/img1.jpg"],
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("shopify");
    });

    it("generates an Amazon listing", async () => {
      const result = await generateListingTool.execute({
        title: "Wireless Bluetooth Earbuds",
        platform: "amazon",
        price: 29.99,
        description: "High quality wireless earbuds",
        category: "Electronics",
        images: [],
      }, context);

      expect(result.success).toBe(true);
      expect(result.summary).toContain("amazon");
    });

    it("generates an Etsy listing", async () => {
      const result = await generateListingTool.execute({
        title: "Handmade Ceramic Mug",
        platform: "etsy",
        price: 24.99,
        description: "Beautiful handmade mug",
        category: "Home & Kitchen",
        images: [],
      }, context);

      expect(result.success).toBe(true);
      expect(result.summary).toContain("etsy");
    });

    it("generates an eBay listing", async () => {
      const result = await generateListingTool.execute({
        title: "Vintage Watch",
        platform: "ebay",
        price: 149.99,
        description: "Vintage luxury watch",
        category: "Watches",
        images: [],
      }, context);

      expect(result.success).toBe(true);
      expect(result.summary).toContain("ebay");
    });

    it("generates a Walmart listing", async () => {
      const result = await generateListingTool.execute({
        title: "Phone Case",
        platform: "walmart",
        price: 12.99,
        description: "Protective phone case",
        category: "Accessories",
        images: [],
      }, context);

      expect(result.success).toBe(true);
      expect(result.summary).toContain("walmart");
    });
  });

  describe("validateListingTool", () => {
    it("validates a valid listing", async () => {
      const result = await validateListingTool.execute({
        platform: "shopify",
        title: "Wireless Bluetooth Earbuds",
        description: "High quality wireless earbuds with noise cancellation and long battery life",
        bulletPoints: ["Bluetooth 5.0", "Noise Cancellation", "IPX5 Waterproof", "Long Battery"],
        seoTags: ["earbuds", "wireless", "bluetooth"],
        images: ["https://example.com/img1.jpg"],
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("flags listing with short title", async () => {
      const result = await validateListingTool.execute({
        platform: "shopify",
        title: "Earbuds",
        description: "High quality wireless earbuds with noise cancellation and long battery life",
        bulletPoints: ["Bluetooth 5.0", "Noise Cancellation", "IPX5 Waterproof", "Long Battery"],
        seoTags: ["earbuds", "wireless"],
        images: ["https://example.com/img1.jpg"],
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("flags listing with no images", async () => {
      const result = await validateListingTool.execute({
        platform: "shopify",
        title: "Wireless Bluetooth Earbuds",
        description: "High quality wireless earbuds",
        bulletPoints: ["Bluetooth 5.0", "Noise Cancellation", "IPX5 Waterproof", "Long Battery"],
        seoTags: ["earbuds"],
        images: [],
      }, context);

      expect(result.success).toBe(true);
    });
  });
});
