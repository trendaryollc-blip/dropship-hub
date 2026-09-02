import { describe, it, expect } from "vitest";
import { STORE_CATALOG, STORE_CATEGORIES, getStorePlatform } from "./store-catalog";

describe("STORE_CATALOG", () => {
  it("has at least 5 platforms", () => {
    expect(STORE_CATALOG.length).toBeGreaterThanOrEqual(5);
  });

  it("each platform has required fields", () => {
    for (const platform of STORE_CATALOG) {
      expect(platform.id).toBeTruthy();
      expect(platform.name).toBeTruthy();
      expect(platform.category).toBeTruthy();
      expect(platform.description).toBeTruthy();
      expect(platform.color).toBeTruthy();
      expect(platform.fields.length).toBeGreaterThan(0);
      expect(platform.setupGuide.length).toBeGreaterThan(0);
    }
  });

  it("has unique IDs", () => {
    const ids = STORE_CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes common stores", () => {
    const ids = STORE_CATALOG.map((p) => p.id);
    expect(ids).toContain("shopify");
    expect(ids).toContain("woocommerce");
    expect(ids).toContain("etsy");
    expect(ids).toContain("trendaryo");
  });
});

describe("STORE_CATEGORIES", () => {
  it("has 3 categories", () => {
    expect(STORE_CATEGORIES).toHaveLength(3);
  });
});

describe("getStorePlatform", () => {
  it("returns platform by ID", () => {
    const platform = getStorePlatform("shopify");
    expect(platform).toBeDefined();
    expect(platform!.name).toBe("Shopify");
  });

  it("returns undefined for unknown ID", () => {
    expect(getStorePlatform("nonexistent")).toBeUndefined();
  });
});
