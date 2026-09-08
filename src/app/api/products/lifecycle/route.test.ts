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
  ProductLifecycleSchema: {},
  validateBody: vi.fn((schema: any, body: any) => {
    if (!body?.productId || !body?.productTitle) {
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

import { GET, POST } from "./route";

function makeReq(url: string, body?: any) {
  const req = {
    json: async () => body || {},
    url,
  } as any;
  return req;
}

describe("GET /api/products/lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns lifecycle products by default", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({ productLifecycle: [{ id: "p1", productTitle: "Widget", currentStage: "testing" }] })
      ),
    }));
    const { GET } = await import("./route");
    const res = await GET(makeReq("http://localhost/api/products/lifecycle"), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.products).toBeDefined();
    expect(Array.isArray(data.products)).toBe(true);
  });

  it("returns alerts when type=alerts", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({ lifecycleAlerts: [{ id: "a1", message: "Low stock" }] })
      ),
    }));
    const { GET } = await import("./route");
    const res = await GET(makeReq("http://localhost/api/products/lifecycle?type=alerts"), null as any);
    const data = await res.json();
    expect(data.alerts).toBeDefined();
  });

  it("returns stage distribution when type=stages", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({ productLifecycle: [{ id: "p1", currentStage: "discovery", productTitle: "A" }] })
      ),
    }));
    const { GET } = await import("./route");
    const res = await GET(makeReq("http://localhost/api/products/lifecycle?type=stages"), null as any);
    const data = await res.json();
    expect(data.stages).toBeDefined();
    expect(data.stages).toHaveLength(6);
  });
});

describe("POST /api/products/lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates a lifecycle entry", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              add: vi.fn().mockResolvedValue({ id: "new-id" }),
            }),
          }),
        }),
      }),
    }));
    const { POST } = await import("./route");
    const res = await POST(makeReq("http://localhost/api/products/lifecycle", {
      productId: "p1",
      productTitle: "Test Product",
      currentStage: "discovery",
      stageEnteredAt: "2025-01-01T00:00:00Z",
      totalDaysTracked: 0,
    }), null as any);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
