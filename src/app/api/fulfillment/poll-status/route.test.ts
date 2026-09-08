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

vi.mock("@/lib/fulfillment/auto-tracker", () => ({
  pollAllTrackedOrders: vi.fn(),
  getPollingOrders: vi.fn(),
  shouldContinuePolling: vi.fn(),
}));

vi.mock("@/lib/fulfillment/cj-poller", () => ({
  getOrdersNeedingPoll: vi.fn(),
  updateOrderPollingStatus: vi.fn(),
}));

vi.mock("@/lib/fulfillment/audit-logger", () => ({
  logAuditEvent: vi.fn(),
}));

vi.mock("@/lib/fulfillment/store-adapters", () => ({
  pushTrackingToStore: vi.fn(),
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

describe("/api/fulfillment/poll-status", () => {
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
    return { POST: route.POST, GET: route.GET };
  }

  it("POST polls specific order and finds tracking", async () => {
    const { pollAllTrackedOrders } = await import("@/lib/fulfillment/auto-tracker");
    const { logAuditEvent } = await import("@/lib/fulfillment/audit-logger");
    const { pushTrackingToStore } = await import("@/lib/fulfillment/store-adapters");

    (pollAllTrackedOrders as any).mockResolvedValue([
      { orderId: "order-1", trackingNumber: "TRACK123", carrier: "USPS", found: true },
    ]);
    (logAuditEvent as any).mockReturnValue(undefined);
    (pushTrackingToStore as any).mockResolvedValue(undefined);

    const orderData = {
      id: "order-1", status: "processing", storePlatform: "shopify", storeOrderId: "shop-order-1",
      platformOrders: [{ platform: "cj", platformOrderId: "cj-order-1" }],
    };
    userCollections["fulfillmentOrders"] = { doc: vi.fn().mockReturnValue(docRef(orderData)) };
    userCollections["storeConnections"] = queryRef([{ platform: "shopify", status: "connected", url: "https://my-store.myshopify.com", apiKey: "key", apiSecret: "secret", accessToken: "token" }], false);

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/poll-status", {
      method: "POST", body: JSON.stringify({ orderId: "order-1" }),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("POST order not found returns 404", async () => {
    userCollections["fulfillmentOrders"] = { doc: vi.fn().mockReturnValue(docRef(null)) };

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/poll-status", {
      method: "POST", body: JSON.stringify({ orderId: "nonexistent" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(404);
  });

  it("POST polls all orders when no orderId", async () => {
    const { getPollingOrders } = await import("@/lib/fulfillment/auto-tracker");
    const { pollAllTrackedOrders } = await import("@/lib/fulfillment/auto-tracker");
    (getPollingOrders as any).mockReturnValue([
      { id: "order-1", status: "polling" },
      { id: "order-2", status: "polling" },
    ]);
    (pollAllTrackedOrders as any).mockResolvedValue([]);

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/poll-status", {
      method: "POST", body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.polled).toBe(2);
  });

  it("GET returns polling orders list", async () => {
    const { getPollingOrders } = await import("@/lib/fulfillment/auto-tracker");
    (getPollingOrders as any).mockReturnValue([
      { id: "order-1", status: "polling", lastPollAt: new Date().toISOString() },
    ]);

    const { GET } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/poll-status");
    const res = await GET(req as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.pollingOrders).toBeDefined();
    expect(body.pollingOrders.length).toBe(1);
  });

  it("returns 500 on error", async () => {
    const { pollAllTrackedOrders } = await import("@/lib/fulfillment/auto-tracker");
    (pollAllTrackedOrders as any).mockRejectedValue(new Error("Polling failed"));

    const orderData = { id: "order-1", status: "processing", platformOrders: [{ platform: "cj", platformOrderId: "cj-1" }] };
    userCollections["fulfillmentOrders"] = { doc: vi.fn().mockReturnValue(docRef(orderData)) };

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/poll-status", {
      method: "POST", body: JSON.stringify({ orderId: "order-1" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});
