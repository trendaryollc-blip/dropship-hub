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

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
}

function buildQueryChain(docs: any[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), size: docs.length, empty: docs.length === 0 }),
  };
}

function buildMockDb(collectionMap: Record<string, any[]>) {
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockImplementation((name: string) => {
          return buildQueryChain(collectionMap[name] || []);
        }),
      }),
    }),
  };
}

describe("GET /api/ai/suggestions", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns first-product suggestion when no products exist", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/suggestions");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.suggestions).toBeDefined();
    expect(body.suggestions.some((s: any) => s.id === "first-product")).toBe(true);
  });

  it("returns connect-store suggestion when no stores exist", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          productLifecycle: [{ currentStage: "winning" }],
        })
      ),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/suggestions");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.suggestions.some((s: any) => s.id === "connect-store")).toBe(true);
  });

  it("returns track-profit suggestion when products exist but no profit data", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          productLifecycle: [{ currentStage: "winning" }],
          storeConnections: [{ status: "connected" }],
        })
      ),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/suggestions");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.suggestions.some((s: any) => s.id === "track-profit")).toBe(true);
  });

  it("returns empty suggestions when all data exists", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          productLifecycle: [{ currentStage: "winning" }],
          storeConnections: [{ status: "connected" }],
          profitEntries: [{ netProfit: 100 }],
        })
      ),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/suggestions");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.suggestions).toEqual([]);
  });

  it("returns empty suggestions on error", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("DB error")),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/suggestions");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.suggestions).toEqual([]);
  });
});
