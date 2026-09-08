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
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}

function buildMockDb(collectionMap: Record<string, any[]>) {
  const storeConnectionGet = vi.fn().mockResolvedValue({
    docs: buildMockDocs(collectionMap["storeConnections"] || []),
    empty: !collectionMap["storeConnections"]?.length,
  });

  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockImplementation((name: string) => {
          if (name === "storeConnections") {
            return {
              where: vi.fn().mockReturnThis(),
              orderBy: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              get: storeConnectionGet,
            };
          }
          return buildQueryChain(collectionMap[name] || []);
        }),
      }),
    }),
  };
}

describe("GET /api/ai/context", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns full business context with health score", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          revenue: [{ date: new Date().toISOString().split("T")[0], amount: 500, profit: 150, orders: 5 }],
          productLifecycle: [{ currentStage: "winning" }],
          lifecycleAlerts: [],
          supplierPerformance: [{ supplierId: "s1", supplierName: "Supplier A", reliabilityScore: 90, refundRate: 0.02, avgShippingDays: 5 }],
          supplierAlerts: [],
          routingDecisions: [],
          csConversations: [],
          alerts: [],
          storeConnections: [{ status: "connected", platform: "Shopify" }],
          pushedProducts: [],
          missions: [],
          competitorSearches: [],
          digests: [],
          profitEntries: [],
        })
      ),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/context");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.healthScore).toBeDefined();
    expect(typeof body.healthScore.overall).toBe("number");
    expect(body.revenue).toBeDefined();
    expect(body.lastUpdated).toBeDefined();
    expect(body.dataFreshness).toBe("real-time");
  });

  it("returns stale data freshness when no revenue entries", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/context");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.dataFreshness).toBe("stable" === "stable" ? "stale" : "stale");
    expect(body.dataFreshness).toBe("stale");
  });

  it("computes health score correctly with good metrics", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          revenue: [{ date: new Date().toISOString().split("T")[0], amount: 1000, profit: 350, orders: 10 }],
          productLifecycle: [
            { currentStage: "winning" },
            { currentStage: "scaling" },
            { currentStage: "winning" },
          ],
          lifecycleAlerts: [],
          supplierPerformance: [{ supplierId: "s1", supplierName: "Best Supplier", reliabilityScore: 95, refundRate: 0.01, avgShippingDays: 3 }],
          supplierAlerts: [],
          routingDecisions: [],
          csConversations: [
            { status: "resolved", aiHandled: true },
            { status: "resolved", aiHandled: true },
          ],
          alerts: [],
          storeConnections: [{ status: "connected", platform: "Shopify" }],
          pushedProducts: [{ status: "live" }],
          missions: [{ date: new Date().toISOString().split("T")[0], done: true }],
          competitorSearches: [],
          digests: [],
          profitEntries: [],
        })
      ),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/context");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.healthScore.overall).toBeGreaterThan(50);
    expect(body.healthScore.financial).toBeGreaterThan(0);
  });

  it("returns error on Firestore failure", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("DB connection failed")),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/context");
    const res = await GET(req as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Failed to build context");
  });
});
