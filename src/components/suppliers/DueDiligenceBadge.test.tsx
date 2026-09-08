import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DueDiligenceBadge from "./DueDiligenceBadge";
import type { SupplierDueDiligence } from "@/types/supplier";

function makeReport(overrides: Partial<SupplierDueDiligence> = {}): SupplierDueDiligence {
  return {
    supplierId: "test-supplier",
    supplierName: "Test Supplier",
    overallRiskScore: 30,
    riskLevel: "low",
    generatedAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-08T00:00:00.000Z",
    redFlags: [],
    strengths: ["High reliability"],
    historyAnalysis: {
      reviewPattern: "organic",
      averageReviewAge: 30,
      refundTrend: "stable",
      priceStability: "stable",
      stockConsistency: 90,
    },
    recommendation: {
      verdict: "recommended",
      confidence: 85,
      summary: "Good supplier.",
      bestFor: ["Electronics"],
      avoidFor: [],
    },
    comparableSupplierIds: [],
    ...overrides,
  };
}

describe("DueDiligenceBadge", () => {
  it("renders low risk badge", () => {
    render(<DueDiligenceBadge report={makeReport({ riskLevel: "low" })} />);
    expect(screen.getByText("Low Risk")).toBeDefined();
  });

  it("renders medium risk badge", () => {
    render(<DueDiligenceBadge report={makeReport({ riskLevel: "medium" })} />);
    expect(screen.getByText("Med Risk")).toBeDefined();
  });

  it("renders high risk badge", () => {
    render(<DueDiligenceBadge report={makeReport({ riskLevel: "high" })} />);
    expect(screen.getByText("High Risk")).toBeDefined();
  });

  it("renders critical risk badge", () => {
    render(<DueDiligenceBadge report={makeReport({ riskLevel: "critical" })} />);
    expect(screen.getByText("Critical")).toBeDefined();
  });
});
