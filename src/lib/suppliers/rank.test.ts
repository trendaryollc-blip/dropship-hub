import { describe, it, expect } from "vitest";
import { compareRealSignals, compareSuppliers, listingCountOf, observedPriceRange } from "./rank";
import type { SupplierProfile } from "@/types/supplier";

function makeSupplier(overrides: Partial<SupplierProfile>): SupplierProfile {
  return {
    id: "s",
    name: "Supplier",
    slug: "s",
    location: "",
    country: "",
    flag: "",
    description: "",
    specializations: [],
    trustBadge: "unverified",
    dataSource: "estimated",
    stats: {
      reliabilityScore: 0,
      rating: 0,
      reviews: 0,
      responseTime: "Not measured",
      responseTimeHours: 0,
      shippingDays: 0,
      shippingDaysEU: 0,
      orderCompletionRate: 0,
      disputeRate: 0,
      monthlyOrders: 0,
      totalProducts: 0,
      yearEstablished: 0,
      communicationScore: 0,
      qualityScore: 0,
      priceCompetitiveness: 0,
    },
    shipping: { methods: [], processingTime: "", freeShippingThreshold: null, packagingQuality: "standard" },
    quality: {
      inspection: "",
      returnPolicy: "",
      refundPolicy: "",
      replacementPolicy: "",
      disputeResolution: "",
      certifications: [],
    },
    catalog: { categories: [], priceRange: { min: 0, max: 0 }, moq: 0, samplesAvailable: false, samplePrice: null },
    communication: { methods: [], languages: [], supportHours: "" },
    source: "alibaba",
    sourceUrl: null,
    lastUpdated: "",
    ...overrides,
  };
}

describe("real-signal ranking", () => {
  it("ranks by matching listing count first", () => {
    const many = makeSupplier({ name: "A", stats: { ...makeSupplier({}).stats, totalProducts: 30 } });
    const few = makeSupplier({ name: "B", stats: { ...makeSupplier({}).stats, totalProducts: 3 } });
    expect(compareRealSignals(many, few)).toBeLessThan(0);
  });

  it("prefers a supplier with an observed price range when counts tie", () => {
    const priced = makeSupplier({
      name: "A",
      stats: { ...makeSupplier({}).stats, totalProducts: 5 },
      catalog: { categories: [], priceRange: { min: 2, max: 9 }, moq: 0, samplesAvailable: false, samplePrice: null },
    });
    const unpriced = makeSupplier({
      name: "B",
      stats: { ...makeSupplier({}).stats, totalProducts: 5 },
    });
    expect(compareRealSignals(priced, unpriced)).toBeLessThan(0);
  });

  it("is deterministic by name when everything ties", () => {
    const a = makeSupplier({ name: "Alpha" });
    const b = makeSupplier({ name: "Beta" });
    expect(compareRealSignals(a, b)).toBeLessThan(0);
  });

  it("reading helpers handle missing listings", () => {
    expect(listingCountOf(makeSupplier({ stats: { ...makeSupplier({}).stats, totalProducts: 12 } }))).toBe(12);
    expect(
      observedPriceRange(
        makeSupplier({
          catalog: { categories: [], priceRange: { min: 1, max: 5 }, moq: 0, samplesAvailable: false, samplePrice: null },
        })
      )
    ).toEqual({ min: 1, max: 5 });
    expect(observedPriceRange(makeSupplier({}))).toBeNull();
  });

  it("compareSuppliers switches on the key", () => {
    const highRating = makeSupplier({ name: "A", stats: { ...makeSupplier({}).stats, rating: 4.9 } });
    const lowRating = makeSupplier({ name: "B", stats: { ...makeSupplier({}).stats, rating: 3.1 } });
    expect(compareSuppliers("rating", highRating, lowRating)).toBeLessThan(0);
    // relevance also falls through to rating as its final tie-break
    expect(compareSuppliers("relevance", highRating, lowRating)).toBeLessThan(0);
  });
});
