import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { FULFILLMENT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

function makeRequest(method: string, url: string, body?: any) {
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init) as any;
}

function buildSyncTrackingDb(overrides: {
  orderExists?: boolean;
  orderData?: any;
  storeEmpty?: boolean;
  storeDocs?: any[];
} = {}) {
  const orderExists = overrides.orderExists ?? true;
  const orderData = overrides.orderData ?? {
    storePlatform: "shopify",
    storeOrderId: "shop-order-1",
    platformOrders: [],
  };
  const storeEmpty = overrides.storeEmpty ?? false;
  const storeDocs = overrides.storeDocs ?? [
    {
      data: () => ({
        platform: "shopify",
        url: "https://my-store.myshopify.com",
        apiKey: "key-123",
        apiSecret: "secret-123",
        accessToken: "token-123",
      }),
    },
  ];

  const orderDocUpdate = vi.fn().mockResolvedValue(undefined);

  const mockStoreConnectionsCol: any = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ empty: storeEmpty, docs: storeDocs }),
  };

  const mockOrdersCol: any = {
    doc: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({
        exists: orderExists,
        data: () => orderData,
      }),
      update: orderDocUpdate,
    }),
  };

  const mockUserDoc: any = {};
  mockUserDoc.collection = vi.fn().mockImplementation((name: string) => {
    if (name === "fulfillmentOrders") return mockOrdersCol;
    if (name === "storeConnections") return mockStoreConnectionsCol;
    return { get: vi.fn().mockResolvedValue({ docs: [] }) };
  });

  const db = {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(mockUserDoc),
    }),
  };

  return { db, orderDocUpdate };
}

describe("/api/fulfillment/sync-tracking", () => {
  let mockPushTrackingToStore: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockPushTrackingToStore = vi.fn().mockResolvedValue(true);

    vi.doMock("@/lib/fulfillment/store-adapters", () => ({
      pushTrackingToStore: (...args: any[]) => mockPushTrackingToStore(...args),
    }));
  });

  describe("POST", () => {
    it("syncs tracking successfully", async () => {
      const { db } = buildSyncTrackingDb();
      vi.doMock("@/lib/firebase-admin", () => ({
        getAdminDB: vi.fn().mockResolvedValue(db),
      }));

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/sync-tracking", {
        fulfillmentOrderId: "order-1",
        trackingNumber: "TRACK123",
        carrier: "FedEx",
      });
      const res = await POST(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.platform).toBe("shopify");
      expect(mockPushTrackingToStore).toHaveBeenCalledWith(
        expect.objectContaining({ platform: "shopify" }),
        "shop-order-1",
        "TRACK123",
        "FedEx"
      );
    });

    it("updates order with tracking info after successful sync", async () => {
      const { db, orderDocUpdate } = buildSyncTrackingDb();
      vi.doMock("@/lib/firebase-admin", () => ({
        getAdminDB: vi.fn().mockResolvedValue(db),
      }));

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/sync-tracking", {
        fulfillmentOrderId: "order-1",
        trackingNumber: "TRACK123",
      });
      await POST(req);

      expect(orderDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "shipped",
          platformOrders: expect.arrayContaining([
            expect.objectContaining({
              trackingNumber: "TRACK123",
              carrier: "Other",
              status: "shipped",
            }),
          ]),
        })
      );
    });

    it("returns 400 when fulfillmentOrderId missing", async () => {
      const { db } = buildSyncTrackingDb();
      vi.doMock("@/lib/firebase-admin", () => ({
        getAdminDB: vi.fn().mockResolvedValue(db),
      }));

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/sync-tracking", {
        trackingNumber: "TRACK123",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when trackingNumber missing", async () => {
      const { db } = buildSyncTrackingDb();
      vi.doMock("@/lib/firebase-admin", () => ({
        getAdminDB: vi.fn().mockResolvedValue(db),
      }));

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/sync-tracking", {
        fulfillmentOrderId: "order-1",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when order not found", async () => {
      const { db } = buildSyncTrackingDb({ orderExists: false });
      vi.doMock("@/lib/firebase-admin", () => ({
        getAdminDB: vi.fn().mockResolvedValue(db),
      }));

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/sync-tracking", {
        fulfillmentOrderId: "nonexistent",
        trackingNumber: "TRACK123",
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });

    it("returns 404 when no connected store", async () => {
      const { db } = buildSyncTrackingDb({ storeEmpty: true });
      vi.doMock("@/lib/firebase-admin", () => ({
        getAdminDB: vi.fn().mockResolvedValue(db),
      }));

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/sync-tracking", {
        fulfillmentOrderId: "order-1",
        trackingNumber: "TRACK123",
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });

    it("returns 500 on error", async () => {
      vi.doMock("@/lib/firebase-admin", () => ({
        getAdminDB: vi.fn().mockRejectedValue(new Error("db error")),
      }));

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/sync-tracking", {
        fulfillmentOrderId: "order-1",
        trackingNumber: "TRACK123",
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
