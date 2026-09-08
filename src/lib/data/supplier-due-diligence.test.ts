import { describe, it, expect } from "vitest";
import { SupplierDueDiligenceDocSchema, RedFlagSchema, GenerateDueDiligenceInputSchema } from "./schemas";

describe("SupplierDueDiligenceDocSchema", () => {
  const validDoc = {
    supplierId: "cj-dropshipping",
    supplierName: "CJ Dropshipping",
    overallRiskScore: 35,
    riskLevel: "low" as const,
    generatedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-08T00:00:00.000Z",
    redFlags: [],
    strengths: ["High reliability", "Fast shipping"],
    historyAnalysis: {
      reviewPattern: "organic" as const,
      averageReviewAge: 45,
      refundTrend: "stable" as const,
      priceStability: "stable" as const,
      stockConsistency: 88,
    },
    recommendation: {
      verdict: "recommended" as const,
      confidence: 85,
      summary: "This supplier is reliable and recommended.",
      bestFor: ["Electronics", "Home goods"],
      avoidFor: ["Perishables"],
    },
    comparableSupplierIds: ["aliexpress", "alibaba"],
    createdAt: new Date(),
  };

  it("accepts valid due diligence document", () => {
    const result = SupplierDueDiligenceDocSchema.safeParse(validDoc);
    expect(result.success).toBe(true);
  });

  it("rejects invalid risk level", () => {
    const result = SupplierDueDiligenceDocSchema.safeParse({
      ...validDoc,
      riskLevel: "extreme",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid verdict", () => {
    const result = SupplierDueDiligenceDocSchema.safeParse({
      ...validDoc,
      recommendation: { ...validDoc.recommendation, verdict: "maybe" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects risk score out of range", () => {
    const result = SupplierDueDiligenceDocSchema.safeParse({
      ...validDoc,
      overallRiskScore: 150,
    });
    expect(result.success).toBe(false);
  });

  it("accepts document with red flags", () => {
    const doc = {
      ...validDoc,
      redFlags: [
        {
          type: "high_refunds" as const,
          severity: "warning" as const,
          evidence: "Refund rate is 8%",
          detectedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    const result = SupplierDueDiligenceDocSchema.safeParse(doc);
    expect(result.success).toBe(true);
  });
});

describe("RedFlagSchema", () => {
  it("accepts valid red flag", () => {
    const result = RedFlagSchema.safeParse({
      type: "review_manipulation",
      severity: "critical",
      evidence: "All reviews posted within 24 hours",
      detectedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = RedFlagSchema.safeParse({
      type: "fake_product",
      severity: "warning",
      evidence: "Test",
      detectedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("GenerateDueDiligenceInputSchema", () => {
  it("accepts valid input", () => {
    const result = GenerateDueDiligenceInputSchema.safeParse({
      supplierId: "cj-dropshipping",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with forceRefresh", () => {
    const result = GenerateDueDiligenceInputSchema.safeParse({
      supplierId: "cj-dropshipping",
      forceRefresh: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty supplierId", () => {
    const result = GenerateDueDiligenceInputSchema.safeParse({
      supplierId: "",
    });
    expect(result.success).toBe(false);
  });
});
