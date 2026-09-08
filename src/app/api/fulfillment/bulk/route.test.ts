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

vi.mock("@/lib/fulfillment/bulk-processor", () => ({
  createBulkOperation: vi.fn(),
  startBulkOperation: vi.fn(),
  processBulkResult: vi.fn(),
  getBulkOperation: vi.fn(),
  validateBulkInput: vi.fn(),
  getBulkOperationHistory: vi.fn(),
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

describe("/api/fulfillment/bulk", () => {
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

  it("POST with action=fulfill processes orders", async () => {
    const { createBulkOperation, startBulkOperation, processBulkResult, validateBulkInput } = await import("@/lib/fulfillment/bulk-processor");
    const { orchestrateOrder, createOrchestrationInput } = await import("@/lib/fulfillment/orchestrator");
    const { createDefaultRules } = await import("@/lib/fulfillment/rules-engine");

    (validateBulkInput as any).mockReturnValue({ valid: true });
    (createBulkOperation as any).mockReturnValue({ id: "bulk-1", status: "pending" });
    (startBulkOperation as any).mockReturnValue(undefined);
    (createDefaultRules as any).mockReturnValue([]);
    (createOrchestrationInput as any).mockReturnValue({ orderId: "order-1" });
    (orchestrateOrder as any).mockResolvedValue({ action: "placed_order", state: { selectedSupplier: "cj", cjOrderId: "cj-123" } });
    (processBulkResult as any).mockReturnValue(undefined);

    const orderData = { id: "order-1", status: "pending", items: [{ supplierId: "cj" }] };
    userCollections["fulfillmentOrders"] = { doc: vi.fn().mockReturnValue(docRef(orderData)) };
    userCollections["fulfillmentRules"] = queryRef([], true);
    userCollections["fulfillmentSettings"] = { doc: vi.fn().mockReturnValue(docRef({ autoApprove: true })) };

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/bulk", {
      method: "POST", body: JSON.stringify({ orderIds: ["order-1"], action: "fulfill" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(orchestrateOrder).toHaveBeenCalled();
  });

  it("POST missing orderIds returns 400", async () => {
    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/bulk", {
      method: "POST", body: JSON.stringify({ action: "fulfill" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("POST missing action returns 400", async () => {
    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/bulk", {
      method: "POST", body: JSON.stringify({ orderIds: ["order-1"] }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("GET returns operation history", async () => {
    const { getBulkOperationHistory } = await import("@/lib/fulfillment/bulk-processor");
    (getBulkOperationHistory as any).mockReturnValue([
      { id: "bulk-1", status: "completed", createdAt: new Date().toISOString() },
    ]);

    const { GET } = await loadRoute();
    const req = { nextUrl: new URL("http://localhost/api/fulfillment/bulk") } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.operations).toBeDefined();
    expect(body.operations.length).toBe(1);
  });

  it("returns 500 on error", async () => {
    const { createBulkOperation, validateBulkInput } = await import("@/lib/fulfillment/bulk-processor");
    (validateBulkInput as any).mockReturnValue({ valid: true });
    (createBulkOperation as any).mockImplementation(() => { throw new Error("DB error"); });

    const { POST } = await loadRoute();
    const req = new Request("http://localhost/api/fulfillment/bulk", {
      method: "POST", body: JSON.stringify({ orderIds: ["order-1"], action: "fulfill" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});
