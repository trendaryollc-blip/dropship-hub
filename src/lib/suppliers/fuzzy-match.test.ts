import { describe, it, expect } from "vitest";
import { scoreOfferMatch, pickAutoLink } from "./fuzzy-match";
import type { NormalizedSupplierOffer } from "@/types/supplier-offers";

function offer(over: Partial<NormalizedSupplierOffer>): NormalizedSupplierOffer {
  return {
    supplierId: "alibaba:store",
    platformId: "alibaba",
    supplierName: "Store",
    storeUrl: null,
    productId: "alibaba:store:item",
    title: "wireless earbuds bluetooth",
    image: null,
    url: "https://x",
    unitCost: 10,
    currency: "USD",
    shippingCost: null,
    shippingDays: null,
    rating: null,
    reviews: null,
    inStock: true,
    stockLevel: null,
    moq: null,
    dataSource: "live",
    confidence: 0,
    matchReasons: [],
    ...over,
  };
}

describe("scoreOfferMatch", () => {
  it("scores identical title+price+image near 1", () => {
    const { confidence } = scoreOfferMatch(
      { title: "wireless earbuds bluetooth", image: "https://img/1", price: 10 },
      offer({ image: "https://img/1" }),
    );
    expect(confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("scores unrelated titles near 0", () => {
    const { confidence } = scoreOfferMatch(
      { title: "stainless steel kitchen knife set", image: null, price: 50 },
      offer({ unitCost: 10 }),
    );
    expect(confidence).toBeLessThan(0.5);
  });
});

describe("pickAutoLink", () => {
  it("returns null below threshold", () => {
    const result = pickAutoLink(
      { title: "garden hose nozzle", image: null, price: 20 },
      [offer({ title: "bluetooth speaker waterproof", unitCost: 99 })],
    );
    expect(result).toBeNull();
  });

  it("picks best offer above threshold", () => {
    const result = pickAutoLink(
      { title: "wireless earbuds bluetooth", image: null, price: 10 },
      [offer({ title: "unrelated hammer", unitCost: 99 }), offer({ title: "wireless earbuds bluetooth", unitCost: 10 })],
    );
    expect(result?.offer.title).toBe("wireless earbuds bluetooth");
  });
});
