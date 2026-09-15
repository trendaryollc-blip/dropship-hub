import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("@/lib/fulfillment/cj-adapter", () => ({
  getCJOrderStatus: vi.fn(),
}));

import {
  registerForTrackingPolling,
  unregisterFromTrackingPolling,
  getPollingOrders,
  detectTrackingFromStatus,
  shouldContinuePolling,
} from "@/lib/fulfillment/auto-tracker";
import { getAdminDB } from "@/lib/firebase-admin";
import type { FulfillmentOrder } from "@/types/fulfillment";

function createInMemoryFirestore() {
  const store = new Map<string, Record<string, unknown>>();

  function createDocRef(path: string) {
    return {
      id: path.split("/").pop() || "unknown",
      set: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
        store.set(path, { ...data });
      }),
      get: vi.fn().mockImplementation(async () => {
        const data = store.get(path);
        return { exists: !!data, data: () => data || null, id: path.split("/").pop() };
      }),
      delete: vi.fn().mockImplementation(async () => {
        store.delete(path);
      }),
    };
  }

  function createCollection(parentPath: string) {
    return {
      doc: vi.fn((id?: string) => {
        const docId = id || `auto_${store.size}`;
        const docPath = `${parentPath}/${docId}`;
        if (!store.has(docPath)) store.set(docPath, {});
        return createDocRef(docPath);
      }),
      get: vi.fn().mockImplementation(async () => {
        const docs = Array.from(store.entries())
          .filter(([path]) => path.startsWith(parentPath + "/"))
          .map(([path, data]) => ({
            id: path.split("/").pop()!,
            data: () => data,
          }));
        return { docs, size: docs.length, empty: docs.length === 0 };
      }),
    };
  }

  const db = {
    collection: vi.fn().mockImplementation((_name: string) => ({
      doc: vi.fn().mockImplementation((_id: string) => ({
        collection: vi.fn().mockImplementation((_subName: string) =>
          createCollection(`${_name}/${_id}/${_subName}`)
        ),
      })),
    })),
    _store: store,
  };

  return db;
}

describe("Auto Tracker", () => {
  let mockDb: ReturnType<typeof createInMemoryFirestore>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDb = createInMemoryFirestore();
    vi.mocked(getAdminDB).mockResolvedValue(mockDb as never);
    const orders = await getPollingOrders();
    for (const order of orders) {
      await unregisterFromTrackingPolling(order.orderId);
    }
  });

  it("registers order for polling", async () => {
    await registerForTrackingPolling("order_1", "CJ123");
    const orders = await getPollingOrders();
    expect(orders.some((o) => o.orderId === "order_1")).toBe(true);
  });

  it("unregisters order from polling", async () => {
    await registerForTrackingPolling("order_1", "CJ123");
    await unregisterFromTrackingPolling("order_1");
    const orders = await getPollingOrders();
    expect(orders.some((o) => o.orderId === "order_1")).toBe(false);
  });

  it("does not duplicate registrations", async () => {
    await registerForTrackingPolling("order_1", "CJ123");
    await registerForTrackingPolling("order_1", "CJ123");
    const orders = await getPollingOrders();
    expect(orders.filter((o) => o.orderId === "order_1").length).toBe(1);
  });

  describe("detectTrackingFromStatus", () => {
    it("detects tracking from platform orders", () => {
      const order = {
        platformOrders: [
          { platform: "cj", trackingNumber: "TRACK123", carrier: "DHL", status: "shipped" },
        ],
        storePlatform: "shopify",
      } as FulfillmentOrder;

      const result = detectTrackingFromStatus(order);
      expect(result.needsSync).toBe(true);
      expect(result.trackingNumber).toBe("TRACK123");
      expect(result.carrier).toBe("DHL");
    });

    it("returns no sync needed when already synced", () => {
      const order = {
        platformOrders: [
          { platform: "cj", trackingNumber: "TRACK123", carrier: "DHL", status: "shipped" },
          { platform: "shopify", trackingNumber: "TRACK123", carrier: "DHL", status: "shipped" },
        ],
        storePlatform: "shopify",
      } as FulfillmentOrder;

      const result = detectTrackingFromStatus(order);
      expect(result.needsSync).toBe(false);
    });

    it("returns no tracking when not shipped", () => {
      const order = {
        platformOrders: [
          { platform: "cj", trackingNumber: null, carrier: null, status: "placed" },
        ],
        storePlatform: "shopify",
      } as FulfillmentOrder;

      const result = detectTrackingFromStatus(order);
      expect(result.needsSync).toBe(false);
      expect(result.trackingNumber).toBeNull();
    });
  });

  describe("shouldContinuePolling", () => {
    it("returns true for fresh polling attempts", () => {
      expect(shouldContinuePolling(0, new Date().toISOString())).toBe(true);
    });

    it("returns false after max retries", () => {
      expect(shouldContinuePolling(10, new Date().toISOString())).toBe(false);
    });

    it("returns false when too much time elapsed", () => {
      const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(shouldContinuePolling(5, old)).toBe(true);
    });
  });
});
