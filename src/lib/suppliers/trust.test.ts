import { describe, it, expect } from "vitest";
import { isMeasuredSupplier, resolveTrustBadge, supplierPromptLine } from "./trust";
import type { SupplierProfile } from "@/types/supplier";

const makeSupplier = (overrides: Partial<SupplierProfile> = {}): SupplierProfile => ({
  id: "sup-1",
  name: "Alpha Trading",
  slug: "alpha-trading",
  location: "Shenzhen",
  country: "CN",
  flag: "\ud83c\udde8\ud83c\uddf3",
  description: "",
  specializations: [],
  trustBadge: "gold",
  dataSource: "live",
  stats: {
    reliabilityScore: 0,
    rating: 0,
    reviews: 0,
    responseTime: "",
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
  quality: { inspection: "", returnPolicy: "", refundPolicy: "", replacementPolicy: "", disputeResolution: "", certifications: [] },
  catalog: { categories: [], priceRange: { min: 0, max: 0 }, moq: 0, samplesAvailable: false, samplePrice: null },
  communication: { methods: [], languages: [], supportHours: "" },
  source: "cj",
  sourceUrl: null,
  lastUpdated: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("supplier trust resolution", () => {
  it("forces unverified when no metrics are measured", () => {
    expect(resolveTrustBadge({ trustBadge: "gold", reliabilityScore: 0 })).toBe("unverified");
  });

  it("keeps a valid tier when reliability is measured", () => {
    expect(resolveTrustBadge({ trustBadge: "gold", reliabilityScore: 87 })).toBe("gold");
  });

  it("keeps a valid tier when completion rate is measured", () => {
    expect(resolveTrustBadge({ trustBadge: "silver", orderCompletionRate: 96 })).toBe("silver");
  });

  it("falls back to unverified for an invalid tier even when measured", () => {
    expect(resolveTrustBadge({ trustBadge: "platinum", reliabilityScore: 50 })).toBe("unverified");
  });

  it("returns unverified for a missing tier when measured", () => {
    expect(resolveTrustBadge({ trustBadge: null, reliabilityScore: 70 })).toBe("unverified");
  });

  it("isMeasuredSupplier is false for zero/undefined signals", () => {
    expect(isMeasuredSupplier({})).toBe(false);
    expect(isMeasuredSupplier({ reliabilityScore: 0, orderCompletionRate: 0 })).toBe(false);
  });

  it("supplierPromptLine labels every unmeasured field instead of printing zeros", () => {
    const line = supplierPromptLine(makeSupplier());
    expect(line).toContain("unverified badge");
    expect(line).toContain("reliability unmeasured");
    expect(line).toContain("rating unmeasured");
    expect(line).toContain("shipping time unmeasured");
    expect(line).not.toMatch(/\b0% reliability\b/);
    expect(line).not.toMatch(/\b0 rating\b/);
    expect(line).not.toMatch(/\b0d shipping\b/);
  });

  it("supplierPromptLine reports measured values for a measured supplier", () => {
    const line = supplierPromptLine(
      makeSupplier({
        stats: {
          ...makeSupplier().stats,
          reliabilityScore: 87,
          rating: 4.5,
          shippingDays: 7,
        },
      })
    );
    expect(line).toContain("gold badge");
    expect(line).toContain("87% reliability");
    expect(line).toContain("4.5 rating");
    expect(line).toContain("7d shipping");
    expect(line).not.toContain("unmeasured");
  });

  it("supplierPromptLine resolves the badge even when the stored tier is unmeasured", () => {
    const line = supplierPromptLine(
      makeSupplier({
        trustBadge: "gold",
        stats: { ...makeSupplier().stats, orderCompletionRate: 96 },
      })
    );
    expect(line).toContain("gold badge");
    expect(line).toContain("reliability unmeasured");
  });
});
