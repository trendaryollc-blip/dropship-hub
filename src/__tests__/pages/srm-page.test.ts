import { describe, it, expect } from "vitest";
import type { SRMRecord, SRMSupplier } from "@/types/srm";

describe("SRM Page - Data Types", () => {
  it("SRM record has required fields", () => {
    const record: SRMRecord = {
      id: "srm-1",
      supplierId: "sup-1",
      supplierName: "Shenzhen Electronics",
      score: 85,
      tier: "gold",
      metrics: {
        qualityScore: 90,
        deliveryScore: 85,
        communicationScore: 80,
        priceScore: 75,
        overallScore: 82.5,
      },
      orders: {
        total: 150,
        onTime: 140,
        defectRate: 0.02,
        returnRate: 0.03,
      },
      relationship: {
        startDate: "2023-01-15",
        duration: "1 year 6 months",
        totalSpend: 45000,
        averageOrderValue: 300,
      },
      updatedAt: new Date().toISOString(),
    };
    expect(record.score).toBeGreaterThanOrEqual(0);
    expect(record.score).toBeLessThanOrEqual(100);
    expect(record.tier).toBe("gold");
  });

  it("SRM supplier has required fields", () => {
    const supplier: SRMSupplier = {
      id: "sup-1",
      name: "Shenzhen Electronics",
      country: "China",
      category: "Electronics",
      reliability: 92,
      communication: 88,
      quality: 95,
      leadTime: 7,
      minOrder: 100,
    };
    expect(supplier.reliability).toBeGreaterThan(0);
    expect(supplier.leadTime).toBeGreaterThan(0);
  });

  it("SRM tier categories", () => {
    const tiers = ["platinum", "gold", "silver", "bronze", "unrated"] as const;
    expect(tiers).toHaveLength(5);
  });
});

describe("SRM Page - Business Logic", () => {
  it("calculates overall score from weighted metrics", () => {
    const weights = { quality: 0.35, delivery: 0.25, communication: 0.2, price: 0.2 };
    const scores = { quality: 90, delivery: 85, communication: 80, price: 75 };
    const overall =
      scores.quality * weights.quality +
      scores.delivery * weights.delivery +
      scores.communication * weights.communication +
      scores.price * weights.price;
    expect(overall).toBeCloseTo(83.75, 1);
  });

  it("can classify tier from score", () => {
    const getTier = (score: number) =>
      score >= 90 ? "platinum" : score >= 80 ? "gold" : score >= 70 ? "silver" : score >= 60 ? "bronze" : "unrated";
    expect(getTier(95)).toBe("platinum");
    expect(getTier(85)).toBe("gold");
    expect(getTier(72)).toBe("silver");
    expect(getTier(65)).toBe("bronze");
    expect(getTier(50)).toBe("unrated");
  });

  it("calculates on-time delivery rate", () => {
    const onTime = 140;
    const total = 150;
    const rate = (onTime / total) * 100;
    expect(rate).toBeCloseTo(93.33, 1);
  });

  it("can sort suppliers by score", () => {
    const suppliers: SRMRecord[] = [
      { id: "1", score: 75 } as SRMRecord,
      { id: "2", score: 92 } as SRMRecord,
      { id: "3", score: 88 } as SRMRecord,
    ];
    const sorted = [...suppliers].sort((a, b) => b.score - a.score);
    expect(sorted[0].id).toBe("2");
  });

  it("can filter by tier", () => {
    const records: SRMRecord[] = [
      { id: "1", tier: "gold" } as SRMRecord,
      { id: "2", tier: "silver" } as SRMRecord,
      { id: "3", tier: "gold" } as SRMRecord,
    ];
    const gold = records.filter((r) => r.tier === "gold");
    expect(gold).toHaveLength(2);
  });
});
