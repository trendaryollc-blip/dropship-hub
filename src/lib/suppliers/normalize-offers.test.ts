import { describe, it, expect } from "vitest";
import { normalizeSupplierSources } from "./normalize-offers";

describe("normalizeSupplierSources", () => {
  it("flattens listings and preserves null measurements", () => {
    const offers = normalizeSupplierSources([
      {
        platformId: "alibaba",
        platformName: "Alibaba",
        storeName: "Test Store",
        storeUrl: "https://example.com/store",
        listingCount: 2,
        listings: [
          { title: "Widget Pro", price: 12.5, currency: "USD", image: null, link: "https://x/1", rating: 4.5, reviews: 10 },
          { title: "Widget Lite", price: null, currency: null, image: null, link: "https://x/2" },
        ],
        dataSource: "live",
      },
    ]);
    expect(offers).toHaveLength(2);
    expect(offers[0].unitCost).toBe(12.5);
    expect(offers[0].inStock).toBe(true);
    expect(offers[1].unitCost).toBeNull();
    expect(offers[1].inStock).toBeNull();
  });

  it("skips unknown platforms", () => {
    const offers = normalizeSupplierSources([
      {
        platformId: "mystery",
        platformName: "Mystery",
        storeName: "S",
        storeUrl: "",
        listingCount: 1,
        listings: [{ title: "T", price: 1, currency: null, image: null, link: "https://x" }],
        dataSource: "estimated",
      },
    ]);
    expect(offers).toHaveLength(0);
  });
});
