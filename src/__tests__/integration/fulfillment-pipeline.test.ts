import { describe, it, expect } from "vitest";
import { generateManualOrderDetails, getSupplierUrl } from "@/lib/fulfillment/manual-adapter";
import { getStoreAdapter, getSupportedStorePlatforms } from "@/lib/fulfillment/store-adapters";
import { PLATFORM_CONFIGS, DEFAULT_FULFILLMENT_SETTINGS } from "@/types/fulfillment";

describe("Fulfillment Pipeline Integration", () => {
  const baseParams = {
    platform: "cj" as const,
    platformName: "CJ Dropshipping",
    platformProductId: "CJ12345",
    productName: "Wireless Earbuds",
    quantity: 2,
    unitPrice: 15.99,
    shippingAddress: {
      fullName: "John Doe",
      email: "john@example.com",
      phone: "1234567890",
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "US",
    },
  };

  it("generates order details for all supported platforms", () => {
    const platforms = ["cj", "aliexpress", "amazon", "ebay", "alibaba", "dhgate", "temu", "shein", "banggood", "custom"] as const;
    for (const platform of platforms) {
      const result = generateManualOrderDetails({ ...baseParams, platform });
      expect(result.platform).toBe(platform);
      expect(result.productName).toBe("Wireless Earbuds");
      expect(result.quantity).toBe(2);
      expect(result.instructions.length).toBeGreaterThan(0);
    }
  });

  it("supplier URL generation for supported platforms", () => {
    expect(getSupplierUrl("aliexpress", "12345")).toContain("aliexpress.com");
    expect(getSupplierUrl("amazon", "B12345")).toContain("amazon.com");
    expect(getSupplierUrl("ebay", "12345")).toContain("ebay.com");
    expect(getSupplierUrl("dhgate", "12345")).toContain("dhgate.com");
  });

  it("store adapters are available for supported platforms", () => {
    const platforms = getSupportedStorePlatforms();
    expect(platforms).toContain("shopify");
    expect(platforms).toContain("woocommerce");
    expect(platforms).toContain("etsy");
    expect(platforms).toContain("trendaryo");

    for (const platform of platforms) {
      const adapter = getStoreAdapter(platform);
      expect(adapter).toBeDefined();
      expect(adapter!.platform).toBe(platform);
    }
  });

  it("default fulfillment settings have supplier preferences", () => {
    expect(DEFAULT_FULFILLMENT_SETTINGS.supplierPreferences.length).toBeGreaterThan(0);
    expect(DEFAULT_FULFILLMENT_SETTINGS.minReliabilityScore).toBe(80);
    expect(DEFAULT_FULFILLMENT_SETTINGS.maxShippingDays).toBe(15);
    expect(DEFAULT_FULFILLMENT_SETTINGS.autoApprove.cj).toBe(true);
  });

  it("platform configs cover all major platforms", () => {
    const ids = PLATFORM_CONFIGS.map(p => p.id);
    expect(ids).toContain("cj");
    expect(ids).toContain("aliexpress");
    expect(ids).toContain("amazon");
    expect(ids).toContain("ebay");
    expect(ids).toContain("temu");
  });
});
