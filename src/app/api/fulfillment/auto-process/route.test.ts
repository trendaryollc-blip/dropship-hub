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

vi.mock("@/lib/fulfillment/orchestrator", () => ({
  orchestrateOrder: vi.fn(),
  createOrchestrationInput: vi.fn(),
}));

vi.mock("@/lib/fulfillment/rules-engine", () => ({
  createDefaultRules: vi.fn(),
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

describe("/api/fulfillment/auto-process", () => {
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

  it("POST processes order successfully", async () => {
    const { orchestrateOrder, createOrchestrationInput } = await import("@/lib/fulfillment/orchestrator");
    (createOrchestrationInput as any).mockReturnValue({ orderId: "order-1" });
    (orchestrateOrder as any).mockResolvedValue({ action: "placed_order", state: { selectedSupplier: "cj", cjOrderId: "cj-1" } });

    const orderData = { id: "order-1", status: "pending", items: [{ supplierId: "cj" }] };
    const orderRef = docRef(orderData);
    userCollections["fulfillmentOrders"] = { doc: vi.fn().mockReturnValue(orderRef) };
    userCollections["fulfillmentRules"] = queryRef([], true);
    userCollections["fulfillmentSettings"] = { doc: vi.fn().mockReturnValue(docRef({ autoApprove: true })) };

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/auto-process", {
      method: "POST", body: JSON.stringify({ orderId: "order-1" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.action).toBe("placed_order");
  });

  it("POST missing orderId returns 400", async () => {
    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/auto-process", {
      method: "POST", body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("POST order not found returns 404", async () => {
    const nullRef = docRef(null);
    userCollections["fulfillmentOrders"] = {
      doc: vi.fn().mockReturnValue(nullRef),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
      add: vi.fn(),
    };

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/auto-process", {
      method: "POST", body: JSON.stringify({ orderId: "nonexistent" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(404);
  });

  it("GET returns pending orders", async () => {
    userCollections["fulfillmentOrders"] = queryRef([
      { id: "o1", orderNumber: "ORD-1", customerName: "Test", totalRevenue: 49.99, storePlatform: "shopify", createdAt: "2026-09-01" },
      { id: "o2", orderNumber: "ORD-2", customerName: "Test2", totalRevenue: 29.99, storePlatform: "shopify", createdAt: "2026-09-02" },
    ]);

    const { GET } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/auto-process");
    const res = await GET(req as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.orders).toBeDefined();
    expect(body.orders.length).toBe(2);
  });

  it("returns 500 on error", async () => {
    const { orchestrateOrder } = await import("@/lib/fulfillment/orchestrator");
    (orchestrateOrder as any).mockRejectedValue(new Error("Processing failed"));

    const orderData = { id: "order-1", status: "pending", items: [] };
    const orderRef = docRef(orderData);
    userCollections["fulfillmentOrders"] = { doc: vi.fn().mockReturnValue(orderRef) };
    userCollections["fulfillmentRules"] = queryRef([], true);
    userCollections["fulfillmentSettings"] = { doc: vi.fn().mockReturnValue(docRef(null)) };

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/auto-process", {
      method: "POST", body: JSON.stringify({ orderId: "order-1" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});
