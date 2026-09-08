import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  addReturnRequest,
  getReturnRequests,
  getReturnRequestById,
  updateReturnRequest,
  deleteReturnRequest,
  addRefundCalculation,
  getRefundCalculations,
  updateRefundCalculation,
  addDefectReport,
  getDefectReports,
  updateDefectReport,
  getDefectAnalytics,
  saveReturnSettings,
  getReturnSettings,
  generateReturnLabel,
  calculateRefund,
  detectReturnsFromOrders,
} from "./returns";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => "mock-ts"),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("./utils", () => ({
  handleFirestoreError: vi.fn((_ctx: string, err: unknown) => {
    throw err;
  }),
}));

const mockDoc = vi.mocked(doc);
const mockSetDoc = vi.mocked(setDoc);
const mockDeleteDoc = vi.mocked(deleteDoc);
const mockGetDocs = vi.mocked(getDocs);
const mockCollection = vi.mocked(collection);
const mockQuery = vi.mocked(query);
const mockWhere = vi.mocked(where);
const mockOrderBy = vi.mocked(orderBy);
const mockLimit = vi.mocked(limit);

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue({ id: "docRef" } as any);
  mockCollection.mockReturnValue("colRef" as any);
  mockQuery.mockReturnValue("q" as any);
  mockWhere.mockReturnValue("w" as any);
  mockOrderBy.mockReturnValue("ob" as any);
  mockLimit.mockReturnValue("l" as any);
  mockSetDoc.mockResolvedValue(undefined as any);
  mockDeleteDoc.mockResolvedValue(undefined as any);
});

describe("addReturnRequest", () => {
  it("creates auto-ID doc in returnRequests collection", async () => {
    const data = {
      orderId: "ord-1",
      orderNumber: "ORD-001",
      customerId: "cust-1",
      customerName: "John Doe",
      customerEmail: "john@example.com",
      items: [{ productId: "p1", productName: "Widget", quantity: 1, unitPrice: 9.99, imageUrl: "" }],
      reason: "defective" as const,
      reasonDetails: "Arrived broken",
      supplierId: "sup-1",
      supplierName: "Supplier",
      platform: "shopify",
      storePlatform: "custom",
    };
    const id = await addReturnRequest("uid1", data);
    expect(id).toBe("docRef");
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "returnRequests");
    expect(mockSetDoc).toHaveBeenCalledWith({ id: "docRef" }, expect.objectContaining({
      ...data,
      status: "pending",
      returnLabel: null,
      refundAmount: 0,
    }));
  });

  it("throws on invalid data", async () => {
    await expect(
      addReturnRequest("uid1", {
        orderId: "",
        orderNumber: "ORD-001",
        customerId: "cust-1",
        customerName: "John",
        customerEmail: "not-email",
        items: [],
        reason: "defective",
        reasonDetails: "desc",
        supplierId: "sup-1",
        supplierName: "Supplier",
        platform: "shopify",
        storePlatform: "custom",
      })
    ).rejects.toThrow();
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(
      addReturnRequest("uid1", {
        orderId: "ord-1",
        orderNumber: "ORD-001",
        customerId: "cust-1",
        customerName: "John",
        customerEmail: "j@e.com",
        items: [{ productId: "p1", productName: "W", quantity: 1, unitPrice: 5, imageUrl: "" }],
        reason: "defective",
        reasonDetails: "desc",
        supplierId: "sup-1",
        supplierName: "Supplier",
        platform: "shopify",
        storePlatform: "custom",
      })
    ).rejects.toThrow("write fail");
  });
});

describe("getReturnRequests", () => {
  it("returns return requests with default limit", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{
        id: "ret-1",
        data: () => ({
          orderId: "ord-1",
          orderNumber: "ORD-001",
          customerId: "cust-1",
          customerName: "John",
          customerEmail: "j@e.com",
          items: [{ productId: "p1", productName: "W", quantity: 1, unitPrice: 5, imageUrl: "" }],
          reason: "defective",
          reasonDetails: "desc",
          status: "pending",
          returnLabel: null,
          refundAmount: 0,
          supplierId: "sup-1",
          supplierName: "Supplier",
          platform: "shopify",
          storePlatform: "custom",
          createdAt: "2024-01-01",
        }),
      }],
    } as any);

    const result = await getReturnRequests("uid1");
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("ret-1");
  });

  it("filters by status when provided", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getReturnRequests("uid1", "approved");
    expect(mockWhere).toHaveBeenCalledWith("status", "==", "approved");
  });

  it("throws when getDocs fails", async () => {
    mockGetDocs.mockRejectedValue(new Error("query fail"));
    await expect(getReturnRequests("uid1")).rejects.toThrow("query fail");
  });
});

describe("getReturnRequestById", () => {
  it("returns null when not found", async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] } as any);
    const result = await getReturnRequestById("uid1", "nonexistent");
    expect(result).toBeNull();
  });

  it("returns the return request when found", async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{
        id: "ret-1",
        data: () => ({
          orderId: "ord-1",
          orderNumber: "ORD-001",
          customerId: "cust-1",
          customerName: "John",
          customerEmail: "j@e.com",
          items: [],
          reason: "defective",
          reasonDetails: "desc",
          status: "pending",
          returnLabel: null,
          refundAmount: 0,
          supplierId: "sup-1",
          supplierName: "Supplier",
          platform: "shopify",
          storePlatform: "custom",
          createdAt: "2024-01-01",
        }),
      }],
    } as any);

    const result = await getReturnRequestById("uid1", "ret-1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("ret-1");
  });
});

describe("updateReturnRequest", () => {
  it("updates return request fields", async () => {
    await updateReturnRequest("uid1", "ret-1", { status: "approved", refundAmount: 29.99 });
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "returnRequests", "ret-1");
    expect(mockSetDoc).toHaveBeenCalledWith({ id: "docRef" }, expect.objectContaining({
      status: "approved",
      refundAmount: 29.99,
    }), { merge: true });
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("update fail"));
    await expect(updateReturnRequest("uid1", "ret-1", { status: "denied" })).rejects.toThrow("update fail");
  });
});

describe("deleteReturnRequest", () => {
  it("deletes doc by return ID", async () => {
    await deleteReturnRequest("uid1", "ret-1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "returnRequests", "ret-1");
    expect(mockDeleteDoc).toHaveBeenCalledWith({ id: "docRef" });
  });

  it("throws when deleteDoc fails", async () => {
    mockDeleteDoc.mockRejectedValue(new Error("delete fail"));
    await expect(deleteReturnRequest("uid1", "ret-1")).rejects.toThrow("delete fail");
  });
});

describe("addRefundCalculation", () => {
  it("creates auto-ID doc in refundCalculations collection", async () => {
    const data = {
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
    };
    const id = await addRefundCalculation("uid1", data);
    expect(id).toBe("docRef");
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "refundCalculations");
    expect(mockSetDoc).toHaveBeenCalledWith({ id: "docRef" }, expect.objectContaining({
      ...data,
      processed: false,
      processedAt: null,
    }));
  });

  it("throws when setDoc fails", async () => {
    mockSetDoc.mockRejectedValue(new Error("write fail"));
    await expect(addRefundCalculation("uid1", {
      returnRequestId: "ret-1",
      orderId: "ord-1",
      subtotal: 10,
      shippingCost: 0,
      platformFees: 0,
      supplierRefundAmount: 10,
      totalRefund: 10,
      refundMethod: "original",
      supplierPolicy: { type: "full_refund", restockingFeePercent: 0, refundWindowDays: 30, returnShippingPaidBy: "seller" },
    })).rejects.toThrow("write fail");
  });
});

describe("getRefundCalculations", () => {
  it("returns refunds with default limit", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{
        id: "ref-1",
        data: () => ({
          returnRequestId: "ret-1",
          orderId: "ord-1",
          subtotal: 29.99,
          shippingCost: 4.99,
          platformFees: 2.50,
          supplierRefundAmount: 29.99,
          totalRefund: 32.48,
          refundMethod: "original",
          supplierPolicy: { type: "full_refund", restockingFeePercent: 0, refundWindowDays: 30, returnShippingPaidBy: "seller" },
          processed: false,
          processedAt: null,
          createdAt: "2024-01-01",
        }),
      }],
    } as any);

    const result = await getRefundCalculations("uid1");
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("ref-1");
  });

  it("filters by returnRequestId when provided", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getRefundCalculations("uid1", "ret-1");
    expect(mockWhere).toHaveBeenCalledWith("returnRequestId", "==", "ret-1");
  });
});

describe("updateRefundCalculation", () => {
  it("updates refund calculation fields", async () => {
    await updateRefundCalculation("uid1", "ref-1", { processed: true, processedAt: "2024-01-01" });
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "refundCalculations", "ref-1");
    expect(mockSetDoc).toHaveBeenCalledWith({ id: "docRef" }, { processed: true, processedAt: "2024-01-01" }, { merge: true });
  });
});

describe("addDefectReport", () => {
  it("creates auto-ID doc in defectReports collection", async () => {
    const data = {
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
    const id = await addDefectReport("uid1", data);
    expect(id).toBe("docRef");
    expect(mockCollection).toHaveBeenCalledWith({}, "users", "uid1", "defectReports");
    expect(mockSetDoc).toHaveBeenCalledWith({ id: "docRef" }, expect.objectContaining({
      ...data,
      resolution: "pending",
      resolved: false,
      resolvedAt: null,
    }));
  });

  it("throws on invalid data", async () => {
    await expect(
      addDefectReport("uid1", {
        productId: "",
        productName: "",
        supplierId: "",
        supplierName: "",
        orderId: "",
        defectType: "broken",
        description: "",
        severity: "high",
        reportedBy: "customer",
      })
    ).rejects.toThrow();
  });
});

describe("getDefectReports", () => {
  it("returns defect reports with default limit", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{
        id: "def-1",
        data: () => ({
          productId: "prod-1",
          productName: "Widget",
          supplierId: "sup-1",
          supplierName: "Supplier",
          orderId: "ord-1",
          defectType: "broken",
          description: "desc",
          severity: "high",
          reportedBy: "customer",
          resolution: "pending",
          resolved: false,
          resolvedAt: null,
          createdAt: "2024-01-01",
        }),
      }],
    } as any);

    const result = await getDefectReports("uid1");
    expect(mockLimit).toHaveBeenCalledWith(100);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("def-1");
  });

  it("filters by supplierId when provided", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] } as any);
    await getDefectReports("uid1", "sup-1");
    expect(mockWhere).toHaveBeenCalledWith("supplierId", "==", "sup-1");
  });
});

describe("updateDefectReport", () => {
  it("updates defect report fields", async () => {
    await updateDefectReport("uid1", "def-1", { resolution: "replacement_sent", resolved: true, resolvedAt: "2024-01-01" });
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "defectReports", "def-1");
    expect(mockSetDoc).toHaveBeenCalledWith({ id: "docRef" }, { resolution: "replacement_sent", resolved: true, resolvedAt: "2024-01-01" }, { merge: true });
  });
});

describe("saveReturnSettings", () => {
  it("saves settings to default doc", async () => {
    const settings = {
      autoDetectReturns: true,
      detectIntervalMinutes: 60,
      autoGenerateLabels: true,
      defaultRefundMethod: "original" as const,
      notifyCustomer: true,
      restockingFeePercent: 0,
      returnWindowDays: 30,
    };
    await saveReturnSettings("uid1", settings);
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1", "returnSettings", "default");
    expect(mockSetDoc).toHaveBeenCalledWith({ id: "docRef" }, settings);
  });
});

describe("getReturnSettings", () => {
  it("returns null when no settings exist", async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] } as any);
    const result = await getReturnSettings("uid1");
    expect(result).toBeNull();
  });

  it("returns settings when found", async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{
        id: "default",
        data: () => ({
          autoDetectReturns: true,
          detectIntervalMinutes: 60,
          autoGenerateLabels: true,
          defaultRefundMethod: "original",
          notifyCustomer: true,
          restockingFeePercent: 0,
          returnWindowDays: 30,
        }),
      }],
    } as any);

    const result = await getReturnSettings("uid1");
    expect(result).not.toBeNull();
    expect(result!.autoDetectReturns).toBe(true);
  });
});

describe("generateReturnLabel", () => {
  it("generates label with tracking number", () => {
    const label = generateReturnLabel("ord-1", "ret-1", "Test Supplier");
    expect(label).not.toBeNull();
    expect(label!.trackingNumber).toMatch(/^RT/);
    expect(label!.carrier).toBeTruthy();
    expect(label!.returnAddress).toContain("Test Supplier");
    expect(label!.instructions).toContain("Print this return label");
    expect(label!.instructions).toContain(label!.trackingNumber);
    expect(label!.generatedAt).toBeTruthy();
  });

  it("labelUrl is null", () => {
    const label = generateReturnLabel("ord-1", "ret-1", "Supplier");
    expect(label!.labelUrl).toBeNull();
  });
});

describe("calculateRefund", () => {
  it("full refund returns subtotal + shipping", () => {
    const result = calculateRefund(50, 5, 2, {
      type: "full_refund",
      restockingFeePercent: 0,
      returnShippingPaidBy: "seller",
    });
    expect(result.supplierRefundAmount).toBe(50);
    expect(result.totalRefund).toBe(53);
  });

  it("partial refund applies restocking fee", () => {
    const result = calculateRefund(100, 0, 0, {
      type: "partial_refund",
      restockingFeePercent: 15,
      returnShippingPaidBy: "seller",
    });
    expect(result.supplierRefundAmount).toBe(85);
    expect(result.totalRefund).toBe(85);
  });

  it("store credit returns subtotal", () => {
    const result = calculateRefund(50, 5, 0, {
      type: "store_credit_only",
      restockingFeePercent: 0,
      returnShippingPaidBy: "buyer",
    });
    expect(result.supplierRefundAmount).toBe(50);
    expect(result.totalRefund).toBe(50);
  });

  it("no refund returns 0 supplier amount but refunds seller-paid shipping", () => {
    const result = calculateRefund(50, 5, 0, {
      type: "no_refund",
      restockingFeePercent: 0,
      returnShippingPaidBy: "seller",
    });
    expect(result.supplierRefundAmount).toBe(0);
    expect(result.totalRefund).toBe(5);
  });

  it("subtracts platform fees", () => {
    const result = calculateRefund(50, 0, 5, {
      type: "full_refund",
      restockingFeePercent: 0,
      returnShippingPaidBy: "seller",
    });
    expect(result.totalRefund).toBe(45);
  });

  it("buyer pays return shipping", () => {
    const result = calculateRefund(50, 5, 0, {
      type: "full_refund",
      restockingFeePercent: 0,
      returnShippingPaidBy: "buyer",
    });
    expect(result.totalRefund).toBe(50);
  });

  it("rounds to 2 decimal places", () => {
    const result = calculateRefund(33.33, 3.33, 1.11, {
      type: "full_refund",
      restockingFeePercent: 0,
      returnShippingPaidBy: "seller",
    });
    expect(result.supplierRefundAmount).toBe(33.33);
    expect(result.totalRefund).toBe(35.55);
  });

  it("never returns negative totalRefund", () => {
    const result = calculateRefund(10, 0, 20, {
      type: "full_refund",
      restockingFeePercent: 0,
      returnShippingPaidBy: "seller",
    });
    expect(result.totalRefund).toBe(0);
  });
});
