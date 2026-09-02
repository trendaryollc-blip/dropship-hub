import { describe, it, expect } from "vitest";
import { STORE_CATALOG, getStorePlatform } from "@/lib/store-catalog";
import { validateBody, StoreConnectionSchema, StorePushInputSchema } from "@/lib/validation";

describe("Store Pipeline Integration", () => {
  it("validates Shopify connection", () => {
    const result = validateBody(StoreConnectionSchema, {
      platform: "shopify",
      name: "My Store",
      url: "https://my-store.myshopify.com",
      accessToken: "shpat_xxxxx",
    });
    expect(result.success).toBe(true);
  });

  it("validates WooCommerce connection", () => {
    const result = validateBody(StoreConnectionSchema, {
      platform: "woocommerce",
      name: "My WooCommerce",
      url: "https://my-store.com",
      apiKey: "ck_xxxxx",
      apiSecret: "cs_xxxxx",
    });
    expect(result.success).toBe(true);
  });

  it("validates product push input", () => {
    const result = validateBody(StorePushInputSchema, {
      storeId: "store-1",
      productTitle: "Wireless Earbuds Pro",
      productPrice: 29.99,
      productDescription: "High quality wireless earbuds",
    });
    expect(result.success).toBe(true);
  });

  it("rejects product push with negative price", () => {
    const result = validateBody(StorePushInputSchema, {
      storeId: "store-1",
      productTitle: "Test",
      productPrice: -5,
    });
    expect(result.success).toBe(false);
  });

  it("all store platforms have setup guides", () => {
    for (const platform of STORE_CATALOG) {
      const found = getStorePlatform(platform.id);
      expect(found).toBeDefined();
      expect(found!.setupGuide.length).toBeGreaterThan(0);
      expect(found!.fields.length).toBeGreaterThan(0);
    }
  });

  it("validates Trendaryo connection", () => {
    const result = validateBody(StoreConnectionSchema, {
      platform: "trendaryo",
      name: "Trendaryo Store",
      url: "https://trendaryo.com",
    });
    expect(result.success).toBe(true);
  });
});
