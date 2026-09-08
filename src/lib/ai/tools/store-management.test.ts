import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStoreProductsTool,
  getStorePerformanceTool,
} from "./store-management";
import { getAdminDB } from "@/lib/firebase-admin";

vi.mock("@/lib/fulfillment/store-adapters", () => ({
  getStoreAdapter: vi.fn().mockReturnValue({
    platform: "shopify",
    fetchOrders: vi.fn().mockResolvedValue([]),
    pushTracking: vi.fn().mockResolvedValue(true),
  }),
  fetchOrdersFromStore: vi.fn().mockResolvedValue([]),
  getSupportedStorePlatforms: vi.fn().mockReturnValue(["shopify", "woocommerce", "etsy"]),
}));

vi.mock("@/lib/fulfillment/inventory-sync", () => ({
  syncInventoryForStore: vi.fn().mockResolvedValue({
    success: true,
    synced: 5,
    failed: 0,
    errors: [],
  }),
  fetchCJInventory: vi.fn().mockResolvedValue([]),
  detectInventoryChanges: vi.fn().mockReturnValue([]),
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
  const mockDocs = [
    { data: () => ({ id: "prod_1", title: "Product 1", price: 29.99, status: "pushed" }) },
    { data: () => ({ id: "prod_2", title: "Product 2", price: 39.99, status: "pushed" }) },
  ];
  const mockGet = vi.fn().mockResolvedValue({ docs: mockDocs });
  const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockCollection = vi.fn().mockReturnValue({ where: mockWhere });
  const mockUserDoc = { collection: mockCollection };
  const mockUsersCollection = { doc: vi.fn(() => mockUserDoc) };
  vi.mocked(getAdminDB).mockResolvedValue({ collection: vi.fn(() => mockUsersCollection) } as never);
});

describe("Store Management Tools", () => {
  describe("getStoreProductsTool", () => {
    it("gets store products", async () => {
      const result = await getStoreProductsTool.execute({
        storeId: "store_1",
        limit: 10,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Found");
    });
  });

  describe("getStorePerformanceTool", () => {
    it("gets store performance metrics", async () => {
      const ordersDocs = [
        { data: () => ({ totalRevenue: 100 }) },
        { data: () => ({ totalRevenue: 150 }) },
      ];
      const ordersGet = vi.fn().mockResolvedValue({ docs: ordersDocs });
      const ordersLimit = vi.fn().mockReturnValue({ get: ordersGet });
      const ordersWhere = vi.fn().mockReturnThis();
      const ordersQuery = { where: ordersWhere, limit: ordersLimit, get: ordersGet };
      const ordersCollection = vi.fn().mockReturnValue(ordersQuery);

      const mockDb = {
        collection: vi.fn((path: string) => ({
          doc: vi.fn(() => ({
            collection: vi.fn((collPath: string) => {
              if (collPath.includes("fulfillmentOrders")) return ordersQuery;
              return { doc: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ exists: false, data: () => null }) }) };
            }),
          })),
        })),
      };

      vi.mocked(getAdminDB).mockResolvedValue(mockDb as never);

      const result = await getStorePerformanceTool.execute({
        storeId: "store_1",
        period: "30d",
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("30d");
    });
  });
});
