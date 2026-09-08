import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  routeOrderTool,
  getTrackingTool,
  getFulfillmentStatusTool,
  getSupplierInventoryTool,
} from "./orders-fulfillment";
import { getAdminDB } from "@/lib/firebase-admin";

vi.mock("@/lib/fulfillment/supplier-router", () => ({
  routeOrder: vi.fn().mockReturnValue({
    selectedSupplier: {
      supplierId: "cj",
      supplierName: "CJ Dropshipping",
      totalScore: 85,
    },
    alternatives: [],
    reason: "Best balance of cost and speed",
    routedAt: new Date().toISOString(),
  }),
  createRoutingInput: vi.fn().mockReturnValue({
    order: {},
    supplierInventory: [],
    optimization: "balanced",
    maxShippingDays: 15,
    minReliability: 80,
    customerCountry: "US",
    preferLocalWarehouse: false,
  }),
}));

vi.mock("@/lib/fulfillment/cj-adapter", () => ({
  placeCJOrder: vi.fn().mockResolvedValue({ success: true, orderId: "cj_123" }),
  getCJOrderStatus: vi.fn().mockResolvedValue({ status: "shipped", trackingNumber: "TRACK123", carrier: "CJ" }),
}));

vi.mock("@/lib/fulfillment/shipment-tracker", () => ({
  getShipmentStatus: vi.fn().mockResolvedValue({
    status: "shipped",
    trackingNumber: "TRACK123",
    carrier: "CJ",
    events: [],
  }),
  syncTrackingToStore: vi.fn().mockResolvedValue({ success: true }),
  pollAllShipments: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/fulfillment/inventory-checker", () => ({
  checkInventory: vi.fn().mockResolvedValue({ inStock: true, stockLevel: 100 }),
  batchCheckInventory: vi.fn().mockResolvedValue([
    { productId: "prod_1", inStock: true, stockLevel: 100 },
    { productId: "prod_2", inStock: false, stockLevel: 0 },
  ]),
}));

vi.mock("@/lib/fulfillment/bulk-processor", () => ({
  executeBulkOrderPlacement: vi.fn().mockResolvedValue({
    success: true,
    successfulOrders: 2,
    totalOrders: 2,
    failedOrders: 0,
  }),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

const context = {
  uid: "test-user",
  executionId: "exec_test",
  trigger: "ai_chat" as const,
  mode: "ai_assist" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  const mockDoc = {
    get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
  };
  const mockCollection = {
    doc: vi.fn(() => mockDoc),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: [], size: 0 }),
  };
  const mockUserDoc = { collection: vi.fn(() => mockCollection) };
  const mockUsersCollection = { doc: vi.fn(() => mockUserDoc) };
  vi.mocked(getAdminDB).mockResolvedValue({ collection: vi.fn(() => mockUsersCollection) } as never);
});

describe("Order & Fulfillment Tools", () => {
  describe("routeOrderTool", () => {
    it("routes an order to best supplier", async () => {
      const result = await routeOrderTool.execute({
        orderId: "order_1",
        items: [{ productId: "prod_1", name: "Test Product", quantity: 1, unitCost: 10 }],
        customerCountry: "US",
        optimization: "balanced",
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Best supplier");
    });
  });

  describe("getTrackingTool", () => {
    it("gets tracking information", async () => {
      const result = await getTrackingTool.execute({
        cjOrderNumber: "cj_123",
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("shipped");
    });
  });

  describe("getFulfillmentStatusTool", () => {
    it("gets fulfillment status", async () => {
      const result = await getFulfillmentStatusTool.execute({
        orderId: "order_1",
      }, context);

      expect(result.success).toBe(true);
    });
  });

  describe("getSupplierInventoryTool", () => {
    it("checks supplier inventory", async () => {
      const result = await getSupplierInventoryTool.execute({
        productIds: ["prod_1", "prod_2"],
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Checked");
    });
  });
});
