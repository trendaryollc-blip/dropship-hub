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
} from "@/types/returns";
import type {
  ReturnRequest,
  ReturnReason,
  ReturnStatus,
  DefectReport,
  DefectSeverity,
  RefundCalculation,
} from "@/types/returns";

describe("Returns Page - Return List", () => {
  it("return request has required fields", () => {
    const ret: ReturnRequest = {
      id: "ret-1",
      orderId: "ord-1",
      orderNumber: "ORD-001",
      customerId: "cust-1",
      customerName: "John Doe",
      customerEmail: "john@example.com",
      items: [{ productId: "p1", productName: "Widget", quantity: 2, unitPrice: 19.99, imageUrl: "" }],
      reason: "defective",
      reasonDetails: "Arrived broken",
      status: "pending",
      returnLabel: null,
      refundAmount: 0,
      supplierId: "sup-1",
      supplierName: "Test Supplier",
      platform: "shopify",
      storePlatform: "custom",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(ret.id).toBe("ret-1");
    expect(ret.status).toBe("pending");
    expect(ret.items).toHaveLength(1);
    expect(ret.items[0].quantity).toBe(2);
  });

  it("supports all return reasons", () => {
    const reasons: ReturnReason[] = [
      "defective", "wrong_item", "not_as_described", "changed_mind",
      "damaged_in_shipping", "size_issue", "quality_issue", "other",
    ];
    expect(reasons).toHaveLength(8);
    for (const reason of reasons) {
      expect(RETURN_REASON_LABELS[reason]).toBeTruthy();
    }
  });

  it("supports all return statuses", () => {
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

  it("can filter returns by status", () => {
    const returns: ReturnRequest[] = [
      { id: "1", status: "pending" } as ReturnRequest,
      { id: "2", status: "approved" } as ReturnRequest,
      { id: "3", status: "pending" } as ReturnRequest,
    ];
    const filtered = returns.filter((r) => r.status === "pending");
    expect(filtered).toHaveLength(2);
  });

  it("can filter returns by search query", () => {
    const returns: ReturnRequest[] = [
      { id: "1", orderNumber: "ORD-001", customerName: "John", supplierName: "Acme" } as ReturnRequest,
      { id: "2", orderNumber: "ORD-002", customerName: "Jane", supplierName: "Beta" } as ReturnRequest,
    ];
    const query = "ORD-001";
    const filtered = returns.filter((r) =>
      r.orderNumber.toLowerCase().includes(query.toLowerCase()) ||
      r.customerName.toLowerCase().includes(query.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("can search by customer name", () => {
    const returns: ReturnRequest[] = [
      { id: "1", orderNumber: "ORD-001", customerName: "John Smith", supplierName: "Acme" } as ReturnRequest,
      { id: "2", orderNumber: "ORD-002", customerName: "Jane Doe", supplierName: "Beta" } as ReturnRequest,
    ];
    const filtered = returns.filter((r) =>
      r.customerName.toLowerCase().includes("john")
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].customerName).toBe("John Smith");
  });

  it("can search by supplier name", () => {
    const returns: ReturnRequest[] = [
      { id: "1", orderNumber: "ORD-001", customerName: "John", supplierName: "Acme Corp" } as ReturnRequest,
      { id: "2", orderNumber: "ORD-002", customerName: "Jane", supplierName: "Beta Inc" } as ReturnRequest,
    ];
    const filtered = returns.filter((r) =>
      r.supplierName.toLowerCase().includes("acme")
    );
    expect(filtered).toHaveLength(1);
  });

  it("combined status and search filter", () => {
    const returns: ReturnRequest[] = [
      { id: "1", status: "pending", orderNumber: "ORD-001", customerName: "John", supplierName: "Acme" } as ReturnRequest,
      { id: "2", status: "approved", orderNumber: "ORD-002", customerName: "John", supplierName: "Beta" } as ReturnRequest,
      { id: "3", status: "pending", orderNumber: "ORD-003", customerName: "Jane", supplierName: "Acme" } as ReturnRequest,
    ];
    const filtered = returns.filter((r) => {
      const matchesStatus = r.status === "pending";
      const matchesSearch = r.customerName.toLowerCase().includes("john");
      return matchesStatus && matchesSearch;
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("calculates total items correctly", () => {
    const items = [
      { quantity: 2 },
      { quantity: 3 },
      { quantity: 1 },
    ];
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    expect(total).toBe(6);
  });

  it("calculates subtotal correctly", () => {
    const items = [
      { unitPrice: 19.99, quantity: 2 },
      { unitPrice: 9.99, quantity: 1 },
    ];
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    expect(subtotal).toBeCloseTo(49.97);
  });
});

describe("Returns Page - Refunds", () => {
  it("refund calculation has required fields", () => {
    const refund: RefundCalculation = {
      id: "ref-1",
      returnRequestId: "ret-1",
      orderId: "ord-1",
      subtotal: 29.99,
      shippingCost: 4.99,
      platformFees: 2.50,
      supplierRefundAmount: 29.99,
      totalRefund: 32.48,
      refundMethod: "original",
      supplierPolicy: DEFAULT_SUPPLIER_REFUND_POLICY,
      processed: false,
      processedAt: null,
      createdAt: new Date().toISOString(),
    };
    expect(refund.id).toBe("ref-1");
    expect(refund.processed).toBe(false);
    expect(refund.totalRefund).toBeGreaterThan(0);
  });

  it("supports all refund methods", () => {
    const methods = ["original", "partial", "store_credit"] as const;
    expect(methods).toHaveLength(3);
    for (const method of methods) {
      expect(REFUND_METHOD_LABELS[method]).toBeTruthy();
    }
  });

  it("refund can be marked as processed", () => {
    const refund: RefundCalculation = {
      id: "ref-1",
      returnRequestId: "ret-1",
      orderId: "ord-1",
      subtotal: 29.99,
      shippingCost: 4.99,
      platformFees: 2.50,
      supplierRefundAmount: 29.99,
      totalRefund: 32.48,
      refundMethod: "original",
      supplierPolicy: DEFAULT_SUPPLIER_REFUND_POLICY,
      processed: false,
      processedAt: null,
      createdAt: new Date().toISOString(),
    };
    expect(refund.processed).toBe(false);
    refund.processed = true;
    refund.processedAt = new Date().toISOString();
    expect(refund.processed).toBe(true);
    expect(refund.processedAt).toBeTruthy();
  });

  it("calculates total refund from items", () => {
    const items = [
      { unitPrice: 29.99, quantity: 1 },
      { unitPrice: 9.99, quantity: 2 },
    ];
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    expect(subtotal).toBeCloseTo(49.97);
  });
});

describe("Returns Page - Defects", () => {
  it("defect report has required fields", () => {
    const defect: DefectReport = {
      id: "def-1",
      productId: "prod-1",
      productName: "Widget",
      supplierId: "sup-1",
      supplierName: "Supplier",
      orderId: "ord-1",
      defectType: "broken",
      description: "Arrived broken",
      severity: "high",
      reportedBy: "customer",
      resolution: "pending",
      resolved: false,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
    };
    expect(defect.id).toBe("def-1");
    expect(defect.resolved).toBe(false);
    expect(defect.severity).toBe("high");
  });

  it("supports all defect severities", () => {
    const severities: DefectSeverity[] = ["low", "medium", "high", "critical"];
    expect(severities).toHaveLength(4);
    for (const sev of severities) {
      expect(DEFECT_SEVERITY_LABELS[sev]).toBeTruthy();
      expect(DEFECT_SEVERITY_COLORS[sev]).toContain("text-");
    }
  });

  it("supports all defect types", () => {
    const types = [
      "broken", "malfunction", "cosmetic_damage", "missing_parts",
      "wrong_specification", "packaging_damage", "electrical_issue", "other",
    ];
    expect(types).toHaveLength(8);
    for (const type of types) {
      expect(DEFECT_TYPE_LABELS[type as keyof typeof DEFECT_TYPE_LABELS]).toBeTruthy();
    }
  });

  it("supports all defect resolutions", () => {
    const resolutions = [
      "pending", "replacement_sent", "refund_issued",
      "supplier_claimed", "dismissed", "escalated",
    ];
    expect(resolutions).toHaveLength(6);
    for (const res of resolutions) {
      expect(DEFECT_RESOLUTION_LABELS[res as keyof typeof DEFECT_RESOLUTION_LABELS]).toBeTruthy();
    }
  });

  it("defect severity breakdown counts correctly", () => {
    const defects: DefectReport[] = [
      { id: "1", severity: "low" } as DefectReport,
      { id: "2", severity: "high" } as DefectReport,
      { id: "3", severity: "low" } as DefectReport,
      { id: "4", severity: "critical" } as DefectReport,
      { id: "5", severity: "high" } as DefectReport,
    ];

    const breakdown: Record<string, number> = {};
    for (const d of defects) {
      breakdown[d.severity] = (breakdown[d.severity] || 0) + 1;
    }

    expect(breakdown.low).toBe(2);
    expect(breakdown.high).toBe(2);
    expect(breakdown.critical).toBe(1);
    expect(breakdown.medium).toBeUndefined();
  });

  it("top defective products can be computed", () => {
    const defects: DefectReport[] = [
      { id: "1", productId: "p1", productName: "Widget A" } as DefectReport,
      { id: "2", productId: "p1", productName: "Widget A" } as DefectReport,
      { id: "3", productId: "p2", productName: "Widget B" } as DefectReport,
    ];

    const productMap = new Map<string, { productName: string; count: number }>();
    for (const d of defects) {
      const existing = productMap.get(d.productId);
      if (existing) {
        existing.count++;
      } else {
        productMap.set(d.productId, { productName: d.productName, count: 1 });
      }
    }

    const sorted = [...productMap.entries()].sort((a, b) => b[1].count - a[1].count);
    expect(sorted[0][0]).toBe("p1");
    expect(sorted[0][1].count).toBe(2);
  });

  it("supplier defect summary can be computed", () => {
    const defects: DefectReport[] = [
      { id: "1", supplierId: "sup-1", supplierName: "Supplier A", severity: "high" } as DefectReport,
      { id: "2", supplierId: "sup-1", supplierName: "Supplier A", severity: "low" } as DefectReport,
      { id: "3", supplierId: "sup-2", supplierName: "Supplier B", severity: "critical" } as DefectReport,
    ];

    const supplierMap = new Map<string, DefectReport[]>();
    for (const d of defects) {
      const existing = supplierMap.get(d.supplierId) || [];
      existing.push(d);
      supplierMap.set(d.supplierId, existing);
    }

    expect(supplierMap.get("sup-1")).toHaveLength(2);
    expect(supplierMap.get("sup-2")).toHaveLength(1);
  });
});

describe("Returns Page - Settings", () => {
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

describe("Returns Page - KPI Calculations", () => {
  it("pending returns count", () => {
    const returns: ReturnRequest[] = [
      { id: "1", status: "pending" } as ReturnRequest,
      { id: "2", status: "approved" } as ReturnRequest,
      { id: "3", status: "pending" } as ReturnRequest,
      { id: "4", status: "refunded" } as ReturnRequest,
    ];
    const pending = returns.filter((r) => r.status === "pending").length;
    expect(pending).toBe(2);
  });

  it("total refunds calculation", () => {
    const refunds: RefundCalculation[] = [
      { id: "1", totalRefund: 29.99, processed: true } as RefundCalculation,
      { id: "2", totalRefund: 15.00, processed: true } as RefundCalculation,
      { id: "3", totalRefund: 50.00, processed: false } as RefundCalculation,
    ];
    const total = refunds.filter((r) => r.processed).reduce((sum, r) => sum + r.totalRefund, 0);
    expect(total).toBeCloseTo(44.99);
  });

  it("processed today count", () => {
    const today = new Date().toDateString();
    const returns: ReturnRequest[] = [
      { id: "1", status: "approved", updatedAt: new Date().toISOString() } as ReturnRequest,
      { id: "2", status: "refunded", updatedAt: "2024-01-01T00:00:00Z" } as ReturnRequest,
    ];
    const processedToday = returns.filter((r) => {
      return new Date(r.updatedAt).toDateString() === today && r.status !== "pending";
    }).length;
    expect(processedToday).toBe(1);
  });
});
