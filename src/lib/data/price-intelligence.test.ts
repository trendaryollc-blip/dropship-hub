import { describe, it, expect } from "vitest";
import { SupplierOfferSchema, PriceIntelligenceDocSchema, PriceLookupInputSchema } from "./schemas";

describe("SupplierOfferSchema", () => {
  const validOffer = {
    supplierId: "cj-dropshipping",
    supplierName: "CJ Dropshipping",
    trustBadge: "gold" as const,
    unitPrice: 5.99,
    shippingCost: 2.50,
    shippingDays: 5,
    moq: 10,
    totalCostPerUnit: 6.24,
    estimatedMargin: 35.2,
    inStock: true,
    sampleAvailable: true,
    samplePrice: 3.00,
    qualityScore: 88,
    reliabilityScore: 92,
  };

  it("accepts valid offer", () => {
    expect(SupplierOfferSchema.safeParse(validOffer).success).toBe(true);
  });

  it("rejects negative unit price", () => {
    expect(SupplierOfferSchema.safeParse({ ...validOffer, unitPrice: -1 }).success).toBe(false);
  });

  it("rejects invalid trust badge", () => {
    expect(SupplierOfferSchema.safeParse({ ...validOffer, trustBadge: "platinum" }).success).toBe(false);
  });

  it("accepts zero shipping cost", () => {
    expect(SupplierOfferSchema.safeParse({ ...validOffer, shippingCost: 0 }).success).toBe(true);
  });

  it("rejects moq less than 1", () => {
    expect(SupplierOfferSchema.safeParse({ ...validOffer, moq: 0 }).success).toBe(false);
  });
});

describe("PriceLookupInputSchema", () => {
  it("accepts valid input", () => {
    expect(PriceLookupInputSchema.safeParse({ product: "phone case" }).success).toBe(true);
  });

  it("accepts input with optional fields", () => {
    expect(PriceLookupInputSchema.safeParse({ product: "phone case", category: "electronics", sellingPrice: 25 }).success).toBe(true);
  });

  it("rejects empty product", () => {
    expect(PriceLookupInputSchema.safeParse({ product: "" }).success).toBe(false);
  });

  it("rejects negative selling price", () => {
    expect(PriceLookupInputSchema.safeParse({ product: "phone case", sellingPrice: -5 }).success).toBe(false);
  });
});

describe("PriceIntelligenceDocSchema", () => {
  const validDoc = {
    id: "phone-case",
    productQuery: "phone case",
    normalizedProductName: "phone case",
    category: "electronics",
    lastUpdated: "2026-01-01T00:00:00.000Z",
    offers: [],
    bestDeal: "",
    priceHistory: [],
    createdAt: new Date(),
  };

  it("accepts valid doc", () => {
    expect(PriceIntelligenceDocSchema.safeParse(validDoc).success).toBe(true);
  });

  it("accepts doc with offers", () => {
    const doc = {
      ...validDoc,
      offers: [{
        supplierId: "cj", supplierName: "CJ", trustBadge: "gold" as const,
        unitPrice: 5, shippingCost: 2, shippingDays: 5, moq: 10,
        totalCostPerUnit: 5.2, estimatedMargin: 30, inStock: true,
        sampleAvailable: false, samplePrice: 0, qualityScore: 88, reliabilityScore: 92,
      }],
      bestDeal: "cj",
    };
    expect(PriceIntelligenceDocSchema.safeParse(doc).success).toBe(true);
  });
});
