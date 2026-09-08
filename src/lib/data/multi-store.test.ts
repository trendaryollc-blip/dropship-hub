import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock firebase/firestore
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({ id: parts[parts.length - 1] || "mock-doc-id", path: parts.join("/") })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn((_db: unknown, ...parts: string[]) => ({ id: parts[parts.length - 1] || "mock-collection", path: parts.join("/") })),
  query: vi.fn((_col: unknown, ...rest: unknown[]) => ({ _col, _query: rest })),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  where: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
}));

vi.mock("@/lib/data/utils", () => ({
  handleFirestoreError: vi.fn(),
}));

import {
  getUnifiedOrders,
  addUnifiedOrder,
  updateUnifiedOrder,
  getStoreInventory,
  upsertStoreInventory,
  getStorePerformances,
  saveStorePerformance,
  getBulkPushJobs,
  addBulkPushJob,
  updateBulkPushJob,
  getInventorySyncLogs,
  addInventorySyncLog,
} from "@/lib/data/multi-store";
import { getDocs, setDoc, deleteDoc } from "firebase/firestore";

describe("multi-store data layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUnifiedOrders", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error("fail"));
      const result = await getUnifiedOrders("uid-1");
      expect(result).toEqual([]);
    });

    it("returns orders when docs exist", async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [
          { id: "o1", data: () => ({ orderId: "ORD-1", storeId: "s1" }) },
        ],
      } as never);
      const result = await getUnifiedOrders("uid-1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("o1");
    });
  });

  describe("addUnifiedOrder", () => {
    it("creates an order and returns id", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      const id = await addUnifiedOrder("uid-1", {
        orderId: "ORD-1",
        storeId: "s1",
        storeName: "Test Store",
        storePlatform: "shopify",
        orderNumber: "1001",
        customerName: "John",
        customerEmail: "john@test.com",
        items: [],
        totalAmount: 99.99,
        currency: "USD",
        status: "pending",
        fulfillmentStatus: "unfulfilled",
        shippingAddress: { fullName: "", street: "", city: "", state: "", zipCode: "", country: "" },
        createdAt: "",
        updatedAt: "",
      });
      expect(id).toBeDefined();
    });
  });

  describe("updateUnifiedOrder", () => {
    it("updates an order", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      await expect(updateUnifiedOrder("uid-1", "o1", { status: "shipped" })).resolves.not.toThrow();
    });
  });

  describe("getStoreInventory", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error("fail"));
      const result = await getStoreInventory("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("upsertStoreInventory", () => {
    it("upserts inventory item", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      await expect(upsertStoreInventory("uid-1", {
        id: "inv-1",
        productId: "p1",
        title: "Product",
        stores: [],
        totalStock: 100,
        lastSyncedAt: "",
      })).resolves.not.toThrow();
    });
  });

  describe("getStorePerformances", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error("fail"));
      const result = await getStorePerformances("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("saveStorePerformance", () => {
    it("saves performance data", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      await expect(saveStorePerformance("uid-1", {
        storeId: "s1",
        storeName: "Store",
        storePlatform: "shopify",
        metrics: { totalOrders: 10, totalRevenue: 1000, totalProfit: 200, avgOrderValue: 100, conversionRate: 3.5, returnRate: 2, fulfillmentRate: 98, avgShippingDays: 5 },
        trends: { ordersTrend: 10, revenueTrend: 15, profitTrend: 12 },
        period: "30d",
      })).resolves.not.toThrow();
    });
  });

  describe("getBulkPushJobs", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error("fail"));
      const result = await getBulkPushJobs("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("addBulkPushJob", () => {
    it("creates a push job", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      const id = await addBulkPushJob("uid-1", {
        productTitle: "Test Product",
        productImage: "",
        productPrice: 29.99,
        productUrl: "",
        productDescription: "",
        targetStores: [],
        status: "pending",
        totalPushed: 0,
        totalFailed: 0,
        results: [],
        createdAt: "",
      });
      expect(id).toBeDefined();
    });
  });

  describe("updateBulkPushJob", () => {
    it("updates a push job", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      await expect(updateBulkPushJob("uid-1", "j1", { status: "completed" })).resolves.not.toThrow();
    });
  });

  describe("getInventorySyncLogs", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error("fail"));
      const result = await getInventorySyncLogs("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("addInventorySyncLog", () => {
    it("adds a sync log", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      await expect(addInventorySyncLog("uid-1", {
        productId: "p1",
        productTitle: "Product",
        sourceStoreId: "s1",
        sourceStoreName: "Store",
        action: "sync",
        quantityChange: 10,
        previousStock: 50,
        newStock: 60,
        status: "success",
        createdAt: "",
      })).resolves.not.toThrow();
    });
  });
});
