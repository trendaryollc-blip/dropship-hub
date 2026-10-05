import { describe, it, expect } from "vitest";
import { buildSupplierSearchQuery, parseSupplierQuery, scoreSupplierMatch, filterSuppliersByQuery } from "./supplier-query";
import type { SupplierProfile } from "@/types/supplier";

function makeSupplier(overrides: Partial<SupplierProfile>): SupplierProfile {
  return {
    id: "s1",
    name: "Test Supplier",
    slug: "test-supplier",
    location: "Yiwu, China",
    country: "China",
    flag: "🇨🇳",
    description: "",
    specializations: [],
    trustBadge: "gold",
    dataSource: "live",
    stats: {
      reliabilityScore: 90, rating: 4.5, reviews: 100, responseTime: "24h",
      responseTimeHours: 24, shippingDays: 5, shippingDaysEU: 7,
      orderCompletionRate: 99, disputeRate: 1, monthlyOrders: 500,
      totalProducts: 1000, yearEstablished: 2015, communicationScore: 90,
      qualityScore: 88, priceCompetitiveness: 85,
    },
    shipping: { methods: [], processingTime: "", freeShippingThreshold: null, packagingQuality: "standard" },
    quality: { inspection: "", returnPolicy: "", refundPolicy: "", replacementPolicy: "", disputeResolution: "", certifications: [] },
    catalog: { categories: [], priceRange: { min: 0, max: 0 }, moq: 1, samplesAvailable: true, samplePrice: null },
    communication: { methods: [], languages: [], supportHours: "" },
    source: "cj",
    sourceUrl: null,
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

describe("parseSupplierQuery", () => {
  it("drops filler words and keeps meaningful keywords", () => {
    expect(parseSupplierQuery("find reliable suppliers for baby toys")).toEqual(["reliable", "baby", "toys"]);
  });

  it("returns empty for blank query", () => {
    expect(parseSupplierQuery("")).toEqual([]);
    expect(parseSupplierQuery("   ")).toEqual([]);
  });

  it("falls back to the full phrase when every word is filler", () => {
    expect(parseSupplierQuery("the suppliers")).toEqual(["the suppliers"]);
  });
});

describe("buildSupplierSearchQuery", () => {
  it("includes the product category when it fits", () => {
    expect(buildSupplierSearchQuery("Wireless Headphones", "Electronics")).toBe(
      "Wireless Headphones Electronics"
    );
  });

  it("keeps long product titles within the supplier search limit", () => {
    expect(buildSupplierSearchQuery("x".repeat(250), "Electronics")).toBe("x".repeat(200));
  });

  it("uses the category when there is no product title", () => {
    expect(buildSupplierSearchQuery("", "Electronics")).toBe("Electronics");
  });

  it("ignores placeholder categories", () => {
    expect(buildSupplierSearchQuery("Wireless Headphones", "General")).toBe("Wireless Headphones");
  });
});

describe("scoreSupplierMatch", () => {
  const supplier = makeSupplier({
    name: "Toy World Trading",
    specializations: ["Toys", "Baby & Kids"],
    description: "Reliable manufacturer of plush toys.",
  });

  it("matches plural query against singular data", () => {
    expect(scoreSupplierMatch(supplier, ["toys"])).toBeGreaterThan(0);
  });

  it("matches singular query against plural data", () => {
    expect(scoreSupplierMatch(makeSupplier({ specializations: ["Electronics"] }), ["electronic"])).toBeGreaterThan(0);
  });

  it("scores name matches higher than description matches", () => {
    const byName = scoreSupplierMatch(makeSupplier({ name: "Baby Toys Co", description: "" }), ["baby"]);
    const byDescription = scoreSupplierMatch(makeSupplier({ name: "Acme", description: "sells baby items" }), ["baby"]);
    expect(byName).toBeGreaterThan(byDescription);
  });

  it("returns 0 when nothing matches", () => {
    expect(scoreSupplierMatch(supplier, ["agriculture"])).toBe(0);
  });
});

describe("filterSuppliersByQuery", () => {
  const babyToys = makeSupplier({ id: "a", name: "Toy World", specializations: ["Toys", "Baby"] });
  const electronics = makeSupplier({ id: "b", name: "ChipMart", specializations: ["Electronics"] });
  const both = makeSupplier({ id: "c", name: "MegaTrade", specializations: ["Electronics", "Toys"] });

  it("finds suppliers from a full natural-language sentence", () => {
    const results = filterSuppliersByQuery([babyToys, electronics, both], "find reliable suppliers for baby toys");
    expect(results.map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("ranks suppliers matching more keywords first", () => {
    const results = filterSuppliersByQuery([babyToys, electronics, both], "electronics toys");
    expect(results.map((s) => s.id)).toEqual(["c", "a", "b"]);
  });

  it("returns everything for an empty query", () => {
    expect(filterSuppliersByQuery([babyToys, electronics], "")).toHaveLength(2);
  });

  it("returns empty when nothing matches", () => {
    expect(filterSuppliersByQuery([babyToys, electronics], "xyznonexistent123")).toHaveLength(0);
  });
});
