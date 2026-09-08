import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/validation", () => ({
  RoutingDecisionSchema: {},
  validateBody: vi.fn((schema: any, body: any) => {
    if (!body?.selectedSupplier) {
      return { success: false, response: { status: 400, json: async () => ({ error: "Invalid input" }) } };
    }
    return { success: true, data: body };
  }),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
}
function buildQueryChain(docs: any[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}
function buildMockDb(collectionMap: Record<string, any[]>) {
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => buildQueryChain(collectionMap[name] || []));
  return { collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }) };
}

function makeReq(url: string, body?: any) {
  return { json: async () => body || {}, url } as any;
}

describe("GET /api/orders", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 400 for invalid type parameter", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));
    const { GET } = await import("./route");
    const res = await GET(makeReq("http://localhost/api/orders?type=invalid"), null as any);
    expect(res.status).toBe(400);
  });

  it("returns routing decisions when type=decisions", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({ routingDecisions: [{ id: "d1", selectedSupplier: "Supplier A", totalCost: 15 }] })
      ),
    }));
    const { GET } = await import("./route");
    const res = await GET(makeReq("http://localhost/api/orders?type=decisions"), null as any);
    const data = await res.json();
    expect(data.decisions).toBeDefined();
    expect(data.decisions.length).toBe(1);
  });

  it("returns preferences when type=preferences", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ exists: true, id: "default", data: () => ({ preferredSupplier: "A" }) }),
              }),
            }),
          }),
        }),
      }),
    }));
    const { GET } = await import("./route");
    const res = await GET(makeReq("http://localhost/api/orders?type=preferences"), null as any);
    const data = await res.json();
    expect(data.preferences).toBeDefined();
  });

  it("returns analytics when type=analytics", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({ routingDecisions: [{ id: "d1", selectedSupplier: "A", shippingDays: 5, totalCost: 20, reasoning: "fast shipping" }] })
      ),
    }));
    const { GET } = await import("./route");
    const res = await GET(makeReq("http://localhost/api/orders?type=analytics"), null as any);
    const data = await res.json();
    expect(data.analytics).toBeDefined();
    expect(data.analytics.totalRouted).toBe(1);
  });
});

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates a routing decision", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              add: vi.fn().mockResolvedValue({ id: "new-decision" }),
            }),
          }),
        }),
      }),
    }));
    const { POST } = await import("./route");
    const res = await POST(makeReq("http://localhost/api/orders", { selectedSupplier: "Supplier A" }), null as any);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
