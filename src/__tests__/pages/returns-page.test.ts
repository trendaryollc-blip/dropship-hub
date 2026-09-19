import { describe, it, expect } from "vitest";
import {
  RETURN_REASON_LABELS,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
  DEFAULT_SUPPLIER_REFUND_POLICY,
  REFUND_METHOD_LABELS,
  DEFECT_TYPE_LABELS,
  DEFECT_SEVERITY_LABELS,
  DEFECT_SEVERITY_COLORS,
  DEFECT_RESOLUTION_LABELS,
  DEFAULT_RETURN_SETTINGS,
  type ReturnReason,
  type ReturnStatus,
  type DefectSeverity,
} from "@/types/returns";

describe("returns type constants", () => {
  it("every return reason has a label", () => {
    const reasons: ReturnReason[] = [
      "defective", "wrong_item", "not_as_described", "changed_mind",
      "damaged_in_shipping", "size_issue", "quality_issue", "other",
    ];
    expect(reasons).toHaveLength(8);
    for (const reason of reasons) {
      expect(RETURN_REASON_LABELS[reason]).toBeTruthy();
    }
  });

  it("every return status has a label and color", () => {
    const statuses: ReturnStatus[] = [
      "pending", "approved", "label_generated", "shipped_back",
      "received", "inspected", "refunded", "denied", "cancelled",
    ];
    expect(statuses).toHaveLength(9);
    for (const status of statuses) {
      expect(RETURN_STATUS_LABELS[status]).toBeTruthy();
      expect(RETURN_STATUS_COLORS[status]).toContain("text-");
    }
  });

  it("every refund method has a label", () => {
    const methods = ["original", "partial", "store_credit"] as const;
    expect(methods).toHaveLength(3);
    for (const method of methods) {
      expect(REFUND_METHOD_LABELS[method]).toBeTruthy();
    }
  });

  it("every defect severity has a label and color", () => {
    const severities: DefectSeverity[] = ["low", "medium", "high", "critical"];
    expect(severities).toHaveLength(4);
    for (const sev of severities) {
      expect(DEFECT_SEVERITY_LABELS[sev]).toBeTruthy();
      expect(DEFECT_SEVERITY_COLORS[sev]).toContain("text-");
    }
  });

  it("every defect type has a label", () => {
    const types = [
      "broken", "malfunction", "cosmetic_damage", "missing_parts",
      "wrong_specification", "packaging_damage", "electrical_issue", "other",
    ];
    expect(types).toHaveLength(8);
    for (const type of types) {
      expect(DEFECT_TYPE_LABELS[type as keyof typeof DEFECT_TYPE_LABELS]).toBeTruthy();
    }
  });

  it("every defect resolution has a label", () => {
    const resolutions = [
      "pending", "replacement_sent", "refund_issued",
      "supplier_claimed", "dismissed", "escalated",
    ];
    expect(resolutions).toHaveLength(6);
    for (const res of resolutions) {
      expect(DEFECT_RESOLUTION_LABELS[res as keyof typeof DEFECT_RESOLUTION_LABELS]).toBeTruthy();
    }
  });

  it("default settings are reasonable", () => {
    expect(DEFAULT_RETURN_SETTINGS.autoDetectReturns).toBe(true);
    expect(DEFAULT_RETURN_SETTINGS.returnWindowDays).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_RETURN_SETTINGS.returnWindowDays).toBeLessThanOrEqual(365);
    expect(DEFAULT_RETURN_SETTINGS.restockingFeePercent).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RETURN_SETTINGS.restockingFeePercent).toBeLessThanOrEqual(100);
    expect(DEFAULT_RETURN_SETTINGS.detectIntervalMinutes).toBeGreaterThanOrEqual(5);
  });

  it("default refund policy is customer-friendly", () => {
    expect(DEFAULT_SUPPLIER_REFUND_POLICY.type).toBe("full_refund");
    expect(DEFAULT_SUPPLIER_REFUND_POLICY.restockingFeePercent).toBe(0);
    expect(DEFAULT_SUPPLIER_REFUND_POLICY.returnShippingPaidBy).toBe("seller");
  });
});
