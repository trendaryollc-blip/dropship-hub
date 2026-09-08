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

vi.mock("@/lib/fulfillment/store-adapters", () => ({
  fetchOrdersFromStore: vi.fn(),
}));

function docRef(data: Record<string, any> | null) {
  if (!data) {
    const snap = { exists: false, data: () => undefined, id: "none" };
    return { exists: false, data: () => undefined, id: "none", get: vi.fn().mockResolvedValue(snap), set: vi.fn(), update: vi.fn(), delete: vi.fn() };
  }
  const snap = { exists: true, data: () => data, id: "doc-1", update: vi.fn().mockResolvedValue(undefined), set: vi.fn().mockResolvedValue(undefined) };
  const ref: any = { ...snap, get: vi.fn().mockResolvedValue(snap) };
  return ref;
}

function queryRef(docs: any[] = [], empty?: boolean) {
  const snap = { docs: docs.map((d) => ({ id: d.id || "qdoc-1", data: () => d, exists: true })), empty: empty ?? docs.length === 0 };
  const ref: any = {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(snap),
    add: vi.fn().mockResolvedValue({ id: "new-doc" }),
    doc: vi.fn().mockReturnValue(docRef(docs[0] || null)),
  };
  return ref;
}

describe("/api/fulfillment/poll", () => {
  let db: any;
  const userCollections: Record<string, any> = {};

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    Object.keys(userCollections).forEach((k) => delete userCollections[k]);

    db = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockImplementation((name: string) => {
            if (!(name in userCollections)) userCollections[name] = queryRef();
            return userCollections[name];
          }),
        }),
      }),
    };

    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(db),
    }));
  });

  async function loadRoute() {
    const route = await import("./route");
    return { POST: route.POST };
  }

  it("POST polls orders from connected store", async () => {
    const { fetchOrdersFromStore } = await import("@/lib/fulfillment/store-adapters");
    (fetchOrdersFromStore as any).mockResolvedValue([
      { id: "o1", orderNumber: "ORD-1", customerName: "Test", customerEmail: "test@example.com", shippingAddress: {}, items: [{ productId: "p1", quantity: 1 }], total: 49.99, createdAt: "2026-09-01" },
    ]);

    userCollections["storeConnections"] = queryRef([{ id: "store-1", platform: "shopify", status: "connected", url: "https://my-store.myshopify.com", apiKey: "key", apiSecret: "secret", accessToken: "token" }], false);
    userCollections["fulfillmentOrders"] = queryRef([], true);
    userCollections["productSuppliers"] = { doc: vi.fn().mockReturnValue(docRef({ supplierId: "cj", supplierName: "CJ Dropshipping" })) };

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/poll", {
      method: "POST", body: JSON.stringify({ storeId: "store-1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.newOrders).toBe(1);
  });

  it("POST skips existing orders", async () => {
    const { fetchOrdersFromStore } = await import("@/lib/fulfillment/store-adapters");
    (fetchOrdersFromStore as any).mockResolvedValue([
      { id: "o1", orderNumber: "ORD-1", customerName: "Test", customerEmail: "test@example.com", shippingAddress: {}, items: [{ productId: "p1", quantity: 1 }], total: 49.99, createdAt: "2026-09-01" },
    ]);

    userCollections["storeConnections"] = queryRef([{ id: "store-1", platform: "shopify", status: "connected", url: "https://my-store.myshopify.com", apiKey: "key", apiSecret: "secret", accessToken: "token" }], false);
    userCollections["fulfillmentOrders"] = queryRef([{ storeOrderId: "o1", storePlatform: "shopify" }], false);

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/poll", {
      method: "POST", body: JSON.stringify({ storeId: "store-1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.newOrders).toBe(0);
  });

  it("POST returns 0 when no connected stores", async () => {
    userCollections["storeConnections"] = queryRef([], true);

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/poll", {
      method: "POST", body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.newOrders).toBe(0);
  });

  it("returns 500 on error", async () => {
    const { fetchOrdersFromStore } = await import("@/lib/fulfillment/store-adapters");
    (fetchOrdersFromStore as any).mockRejectedValue(new Error("Store API down"));

    userCollections["storeConnections"] = queryRef([{ id: "store-1", platform: "shopify", status: "connected", url: "https://my-store.myshopify.com", apiKey: "key", apiSecret: "secret", accessToken: "token" }], false);

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/poll", {
      method: "POST", body: JSON.stringify({ storeId: "store-1" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});
