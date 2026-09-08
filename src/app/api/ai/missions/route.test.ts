import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AI: { windowMs: 60000, maxRequests: 30 }, AI_CHAT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/utils-helpers", () => ({
  safeNum: (v: unknown, fallback = 0) => (typeof v === "number" ? v : fallback),
  safeStr: (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback),
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
  userDoc.collection = vi.fn().mockImplementation((name: string) => {
    return buildQueryChain(collectionMap[name] || []);
  });
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(userDoc),
    }),
  };
}

describe("/api/ai/missions", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("GET returns missions with stats", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          revenue: [{ date: new Date().toISOString().split("T")[0], amount: 150 }],
          monitoredProducts: [{ id: "p1" }],
          productSuppliers: [],
          csConversations: [],
          alerts: [],
          storeConnections: [],
          products: [],
          missions: [],
        })
      ),
    }));

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/ai/missions");
    const response = await GET(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.missions).toBeDefined();
    expect(data.stats).toBeDefined();
    expect(data.stats.level).toBeGreaterThanOrEqual(1);
  });

  it("PATCH marks mission as complete", async () => {
    const mockDocRef = {
      exists: true,
      data: () => ({ id: "m1", category: "revenue", done: false }),
      update: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
    };
    mockDocRef.get = vi.fn().mockResolvedValue(mockDocRef);

    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue(mockDocRef),
            }),
          }),
        }),
      }),
    }));

    const { PATCH } = await import("./route");
    const request = new Request("http://localhost/api/ai/missions", {
      method: "PATCH",
      body: JSON.stringify({ missionId: "m1" }),
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.xpAwarded).toBe(75);
  });

  it("PATCH missing missionId returns 400", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));

    const { PATCH } = await import("./route");
    const request = new Request("http://localhost/api/ai/missions", {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(400);
  });

  it("PATCH mission not found returns 404", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({
                exists: false,
                data: () => undefined,
                get: vi.fn().mockResolvedValue({ exists: false }),
              }),
            }),
          }),
        }),
      }),
    }));

    const { PATCH } = await import("./route");
    const request = new Request("http://localhost/api/ai/missions", {
      method: "PATCH",
      body: JSON.stringify({ missionId: "nonexistent" }),
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(404);
  });

  it("GET returns 500 on error", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("DB error")),
    }));

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/ai/missions");
    const response = await GET(request as any);
    expect(response.status).toBe(500);
  });
});
