import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  ReturnRequest,
  ReturnRequestItem,
  ReturnLabel,
  ReturnReason,
  ReturnStatus,
  RefundCalculation,
  RefundMethod,
  SupplierRefundPolicy,
  DefectReport,
  DefectType,
  DefectSeverity,
  DefectReportedBy,
  DefectResolution,
  SupplierDefectSummary,
  DefectAnalytics,
  ReturnSettings,
  ReturnStats,
} from "./returns";
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
  ReturnRequestItemSchema,
  ReturnLabelSchema,
  ReturnRequestSchema,
  SupplierRefundPolicySchema,
  RefundCalculationSchema,
  DefectReportSchema,
  ReturnSettingsSchema,
  AddReturnRequestInputSchema,
  AddRefundCalculationInputSchema,
  AddDefectReportInputSchema,
} from "./returns";
import {
  ReturnRequestDocSchema,
  RefundCalculationDocSchema,
  DefectReportDocSchema,
  ReturnSettingsDocSchema,
} from "@/lib/data/schemas";

describe("return types", () => {
  it("ReturnRequestItem has required fields", () => {
    expectTypeOf<ReturnRequestItem>().toHaveProperty("productId");
    expectTypeOf<ReturnRequestItem>().toHaveProperty("productName");
    expectTypeOf<ReturnRequestItem>().toHaveProperty("quantity");
    expectTypeOf<ReturnRequestItem>().toHaveProperty("unitPrice");
    expectTypeOf<ReturnRequestItem>().toHaveProperty("imageUrl");
  });

  it("ReturnLabel has required fields", () => {
    expectTypeOf<ReturnLabel>().toHaveProperty("trackingNumber");
    expectTypeOf<ReturnLabel>().toHaveProperty("carrier");
    expectTypeOf<ReturnLabel>().toHaveProperty("returnAddress");
    expectTypeOf<ReturnLabel>().toHaveProperty("instructions");
    expectTypeOf<ReturnLabel>().toHaveProperty("labelUrl");
    expectTypeOf<ReturnLabel>().toHaveProperty("generatedAt");
  });

  it("ReturnRequest has required fields", () => {
    expectTypeOf<ReturnRequest>().toHaveProperty("id");
    expectTypeOf<ReturnRequest>().toHaveProperty("orderId");
    expectTypeOf<ReturnRequest>().toHaveProperty("orderNumber");
    expectTypeOf<ReturnRequest>().toHaveProperty("customerId");
    expectTypeOf<ReturnRequest>().toHaveProperty("customerName");
    expectTypeOf<ReturnRequest>().toHaveProperty("customerEmail");
    expectTypeOf<ReturnRequest>().toHaveProperty("items");
    expectTypeOf<ReturnRequest>().toHaveProperty("reason");
    expectTypeOf<ReturnRequest>().toHaveProperty("status");
    expectTypeOf<ReturnRequest>().toHaveProperty("returnLabel");
    expectTypeOf<ReturnRequest>().toHaveProperty("refundAmount");
    expectTypeOf<ReturnRequest>().toHaveProperty("supplierId");
    expectTypeOf<ReturnRequest>().toHaveProperty("createdAt");
  });

  it("RefundCalculation has required fields", () => {
    expectTypeOf<RefundCalculation>().toHaveProperty("id");
    expectTypeOf<RefundCalculation>().toHaveProperty("returnRequestId");
    expectTypeOf<RefundCalculation>().toHaveProperty("subtotal");
    expectTypeOf<RefundCalculation>().toHaveProperty("totalRefund");
    expectTypeOf<RefundCalculation>().toHaveProperty("refundMethod");
    expectTypeOf<RefundCalculation>().toHaveProperty("supplierPolicy");
    expectTypeOf<RefundCalculation>().toHaveProperty("processed");
  });

  it("DefectReport has required fields", () => {
    expectTypeOf<DefectReport>().toHaveProperty("id");
    expectTypeOf<DefectReport>().toHaveProperty("productId");
    expectTypeOf<DefectReport>().toHaveProperty("defectType");
    expectTypeOf<DefectReport>().toHaveProperty("severity");
    expectTypeOf<DefectReport>().toHaveProperty("resolution");
    expectTypeOf<DefectReport>().toHaveProperty("resolved");
  });

  it("DefectAnalytics has required fields", () => {
    expectTypeOf<DefectAnalytics>().toHaveProperty("suppliers");
    expectTypeOf<DefectAnalytics>().toHaveProperty("totalDefects");
    expectTypeOf<DefectAnalytics>().toHaveProperty("overallDefectRate");
    expectTypeOf<DefectAnalytics>().toHaveProperty("topDefectProducts");
    expectTypeOf<DefectAnalytics>().toHaveProperty("severityBreakdown");
  });

  it("ReturnSettings has required fields", () => {
    expectTypeOf<ReturnSettings>().toHaveProperty("autoDetectReturns");
    expectTypeOf<ReturnSettings>().toHaveProperty("autoGenerateLabels");
    expectTypeOf<ReturnSettings>().toHaveProperty("defaultRefundMethod");
    expectTypeOf<ReturnSettings>().toHaveProperty("returnWindowDays");
  });
});

describe("RETURN_REASON_LABELS", () => {
  it("covers all return reasons", () => {
    const reasons: ReturnReason[] = [
      "defective", "wrong_item", "not_as_described", "changed_mind",
      "damaged_in_shipping", "size_issue", "quality_issue", "other",
    ];
    expect(Object.keys(RETURN_REASON_LABELS)).toHaveLength(8);
    for (const reason of reasons) {
      expect(RETURN_REASON_LABELS[reason]).toBeTruthy();
      expect(typeof RETURN_REASON_LABELS[reason]).toBe("string");
    }
  });
});

describe("RETURN_STATUS_LABELS", () => {
  it("covers all return statuses", () => {
    const statuses: ReturnStatus[] = [
      "pending", "approved", "label_generated", "shipped_back",
      "received", "inspected", "refunded", "denied", "cancelled",
    ];
    expect(Object.keys(RETURN_STATUS_LABELS)).toHaveLength(9);
    for (const status of statuses) {
      expect(RETURN_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});

describe("RETURN_STATUS_COLORS", () => {
  it("covers all return statuses with valid Tailwind classes", () => {
    const statuses: ReturnStatus[] = [
      "pending", "approved", "label_generated", "shipped_back",
      "received", "inspected", "refunded", "denied", "cancelled",
    ];
    expect(Object.keys(RETURN_STATUS_COLORS)).toHaveLength(9);
    for (const status of statuses) {
      const color = RETURN_STATUS_COLORS[status];
      expect(color).toContain("text-");
      expect(color).toContain("bg-");
    }
  });
});

describe("DEFAULT_SUPPLIER_REFUND_POLICY", () => {
  it("has correct defaults", () => {
    expect(DEFAULT_SUPPLIER_REFUND_POLICY.type).toBe("full_refund");
    expect(DEFAULT_SUPPLIER_REFUND_POLICY.restockingFeePercent).toBe(0);
    expect(DEFAULT_SUPPLIER_REFUND_POLICY.refundWindowDays).toBe(30);
    expect(DEFAULT_SUPPLIER_REFUND_POLICY.returnShippingPaidBy).toBe("seller");
  });
});

describe("REFUND_METHOD_LABELS", () => {
  it("covers all refund methods", () => {
    const methods: RefundMethod[] = ["original", "partial", "store_credit"];
    expect(Object.keys(REFUND_METHOD_LABELS)).toHaveLength(3);
    for (const method of methods) {
      expect(REFUND_METHOD_LABELS[method]).toBeTruthy();
    }
  });
});

describe("DEFECT_TYPE_LABELS", () => {
  it("covers all defect types", () => {
    const types: DefectType[] = [
      "broken", "malfunction", "cosmetic_damage", "missing_parts",
      "wrong_specification", "packaging_damage", "electrical_issue", "other",
    ];
    expect(Object.keys(DEFECT_TYPE_LABELS)).toHaveLength(8);
    for (const type of types) {
      expect(DEFECT_TYPE_LABELS[type]).toBeTruthy();
    }
  });
});

describe("DEFECT_SEVERITY_LABELS and COLORS", () => {
  it("covers all severities", () => {
    const severities: DefectSeverity[] = ["low", "medium", "high", "critical"];
    expect(Object.keys(DEFECT_SEVERITY_LABELS)).toHaveLength(4);
    expect(Object.keys(DEFECT_SEVERITY_COLORS)).toHaveLength(4);
    for (const sev of severities) {
      expect(DEFECT_SEVERITY_LABELS[sev]).toBeTruthy();
      expect(DEFECT_SEVERITY_COLORS[sev]).toContain("text-");
    }
  });
});

describe("DEFECT_RESOLUTION_LABELS", () => {
  it("covers all resolutions", () => {
    const resolutions: DefectResolution[] = [
      "pending", "replacement_sent", "refund_issued",
      "supplier_claimed", "dismissed", "escalated",
    ];
    expect(Object.keys(DEFECT_RESOLUTION_LABELS)).toHaveLength(6);
    for (const res of resolutions) {
      expect(DEFECT_RESOLUTION_LABELS[res]).toBeTruthy();
    }
  });
});

describe("DEFAULT_RETURN_SETTINGS", () => {
  it("has correct defaults", () => {
    expect(DEFAULT_RETURN_SETTINGS.autoDetectReturns).toBe(true);
    expect(DEFAULT_RETURN_SETTINGS.detectIntervalMinutes).toBe(60);
    expect(DEFAULT_RETURN_SETTINGS.autoGenerateLabels).toBe(true);
    expect(DEFAULT_RETURN_SETTINGS.defaultRefundMethod).toBe("original");
    expect(DEFAULT_RETURN_SETTINGS.notifyCustomer).toBe(true);
    expect(DEFAULT_RETURN_SETTINGS.restockingFeePercent).toBe(0);
    expect(DEFAULT_RETURN_SETTINGS.returnWindowDays).toBe(30);
  });
});

describe("Zod schemas", () => {
  const validReturnItem = {
    productId: "prod-1",
    productName: "Test Product",
    quantity: 2,
    unitPrice: 19.99,
    imageUrl: "https://example.com/img.jpg",
  };

  const validReturnLabel = {
    trackingNumber: "RT123456",
    carrier: "USPS",
    returnAddress: "123 Return St",
    instructions: "Pack securely",
    labelUrl: null,
    generatedAt: "2024-01-01T00:00:00Z",
  };

  describe("ReturnRequestItemSchema", () => {
    it("accepts valid item", () => {
      expect(ReturnRequestItemSchema.parse(validReturnItem)).toEqual(validReturnItem);
    });

    it("rejects quantity < 1", () => {
      expect(() => ReturnRequestItemSchema.parse({ ...validReturnItem, quantity: 0 })).toThrow();
    });

    it("rejects negative unitPrice", () => {
      expect(() => ReturnRequestItemSchema.parse({ ...validReturnItem, unitPrice: -5 })).toThrow();
    });

    it("rejects non-integer quantity", () => {
      expect(() => ReturnRequestItemSchema.parse({ ...validReturnItem, quantity: 1.5 })).toThrow();
    });
  });

  describe("ReturnLabelSchema", () => {
    it("accepts valid label", () => {
      expect(ReturnLabelSchema.parse(validReturnLabel)).toEqual(validReturnLabel);
    });

    it("accepts labelUrl as string", () => {
      expect(ReturnLabelSchema.parse({ ...validReturnLabel, labelUrl: "https://example.com/label.pdf" })).toBeTruthy();
    });
  });

  describe("ReturnRequestDocSchema", () => {
    it("accepts valid return request", () => {
      const doc = {
        orderId: "ord-1",
        orderNumber: "ORD-001",
        customerId: "cust-1",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        items: [validReturnItem],
        reason: "defective" as const,
        reasonDetails: "Product arrived broken",
        status: "pending" as const,
        returnLabel: null,
        refundAmount: 0,
        supplierId: "sup-1",
        supplierName: "Test Supplier",
        platform: "shopify",
        storePlatform: "custom",
        createdAt: { toDate: () => new Date() },
      };
      const result = ReturnRequestDocSchema.parse(doc);
      expect(result.orderId).toBe("ord-1");
      expect(result.status).toBe("pending");
    });
  });

  describe("SupplierRefundPolicySchema", () => {
    it("accepts valid policy", () => {
      const policy = {
        type: "full_refund" as const,
        restockingFeePercent: 0,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller" as const,
      };
      expect(SupplierRefundPolicySchema.parse(policy)).toEqual(policy);
    });

    it("rejects restockingFeePercent > 100", () => {
      expect(() => SupplierRefundPolicySchema.parse({
        type: "partial_refund",
        restockingFeePercent: 150,
        refundWindowDays: 30,
        returnShippingPaidBy: "seller",
      })).toThrow();
    });

    it("rejects refundWindowDays < 1", () => {
      expect(() => SupplierRefundPolicySchema.parse({
        type: "full_refund",
        restockingFeePercent: 0,
        refundWindowDays: 0,
        returnShippingPaidBy: "seller",
      })).toThrow();
    });
  });

  describe("RefundCalculationDocSchema", () => {
    it("accepts valid refund calculation", () => {
      const doc = {
        returnRequestId: "ret-1",
        orderId: "ord-1",
        subtotal: 29.99,
        shippingCost: 4.99,
        platformFees: 2.50,
        supplierRefundAmount: 29.99,
        totalRefund: 32.48,
        refundMethod: "original" as const,
        supplierPolicy: {
          type: "full_refund" as const,
          restockingFeePercent: 0,
          refundWindowDays: 30,
          returnShippingPaidBy: "seller" as const,
        },
        processed: false,
        processedAt: null,
        createdAt: { toDate: () => new Date() },
      };
      expect(RefundCalculationDocSchema.parse(doc)).toBeTruthy();
    });
  });

  describe("DefectReportDocSchema", () => {
    it("accepts valid defect report", () => {
      const doc = {
        productId: "prod-1",
        productName: "Broken Widget",
        supplierId: "sup-1",
        supplierName: "Test Supplier",
        orderId: "ord-1",
        defectType: "broken" as const,
        description: "Arrived in pieces",
        severity: "high" as const,
        reportedBy: "customer" as const,
        resolution: "pending" as const,
        resolved: false,
        resolvedAt: null,
        createdAt: { toDate: () => new Date() },
      };
      expect(DefectReportDocSchema.parse(doc)).toBeTruthy();
    });
  });

  describe("AddReturnRequestInputSchema", () => {
    it("accepts valid input", () => {
      const input = {
        orderId: "ord-1",
        orderNumber: "ORD-001",
        customerId: "cust-1",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        items: [validReturnItem],
        reason: "defective" as const,
        reasonDetails: "Product is broken",
        supplierId: "sup-1",
        supplierName: "Supplier",
        platform: "shopify",
        storePlatform: "custom",
      };
      expect(AddReturnRequestInputSchema.parse(input)).toBeTruthy();
    });

    it("rejects empty orderId", () => {
      expect(() => AddReturnRequestInputSchema.parse({
        orderId: "",
        orderNumber: "ORD-001",
        customerId: "cust-1",
        customerName: "John",
        customerEmail: "j@e.com",
        items: [validReturnItem],
        reason: "other",
        reasonDetails: "Detail",
        supplierId: "sup-1",
        supplierName: "Supplier",
        platform: "shopify",
        storePlatform: "custom",
      })).toThrow();
    });

    it("rejects invalid email", () => {
      expect(() => AddReturnRequestInputSchema.parse({
        orderId: "ord-1",
        orderNumber: "ORD-001",
        customerId: "cust-1",
        customerName: "John",
        customerEmail: "not-an-email",
        items: [validReturnItem],
        reason: "other",
        reasonDetails: "Detail",
        supplierId: "sup-1",
        supplierName: "Supplier",
        platform: "shopify",
        storePlatform: "custom",
      })).toThrow();
    });

    it("rejects empty items array", () => {
      expect(() => AddReturnRequestInputSchema.parse({
        orderId: "ord-1",
        orderNumber: "ORD-001",
        customerId: "cust-1",
        customerName: "John",
        customerEmail: "j@e.com",
        items: [],
        reason: "other",
        reasonDetails: "Detail",
        supplierId: "sup-1",
        supplierName: "Supplier",
        platform: "shopify",
        storePlatform: "custom",
      })).toThrow();
    });

    it("rejects invalid reason", () => {
      expect(() => AddReturnRequestInputSchema.parse({
        orderId: "ord-1",
        orderNumber: "ORD-001",
        customerId: "cust-1",
        customerName: "John",
        customerEmail: "j@e.com",
        items: [validReturnItem],
        reason: "invalid_reason",
        reasonDetails: "Detail",
        supplierId: "sup-1",
        supplierName: "Supplier",
        platform: "shopify",
        storePlatform: "custom",
      })).toThrow();
    });
  });

  describe("AddDefectReportInputSchema", () => {
    it("accepts valid input", () => {
      const input = {
        productId: "prod-1",
        productName: "Widget",
        supplierId: "sup-1",
        supplierName: "Supplier",
        orderId: "ord-1",
        defectType: "broken" as const,
        description: "Arrived broken",
        severity: "high" as const,
        reportedBy: "customer" as const,
      };
      expect(AddDefectReportInputSchema.parse(input)).toBeTruthy();
    });

    it("rejects empty description", () => {
      expect(() => AddDefectReportInputSchema.parse({
        productId: "prod-1",
        productName: "Widget",
        supplierId: "sup-1",
        supplierName: "Supplier",
        orderId: "ord-1",
        defectType: "broken",
        description: "",
        severity: "high",
        reportedBy: "customer",
      })).toThrow();
    });

    it("rejects invalid severity", () => {
      expect(() => AddDefectReportInputSchema.parse({
        productId: "prod-1",
        productName: "Widget",
        supplierId: "sup-1",
        supplierName: "Supplier",
        orderId: "ord-1",
        defectType: "broken",
        description: "desc",
        severity: "invalid",
        reportedBy: "customer",
      })).toThrow();
    });
  });

  describe("ReturnSettingsDocSchema", () => {
    it("accepts valid settings", () => {
      const settings = {
        autoDetectReturns: true,
        detectIntervalMinutes: 60,
        autoGenerateLabels: true,
        defaultRefundMethod: "original" as const,
        notifyCustomer: true,
        restockingFeePercent: 0,
        returnWindowDays: 30,
      };
      expect(ReturnSettingsDocSchema.parse(settings)).toBeTruthy();
    });
  });
});
