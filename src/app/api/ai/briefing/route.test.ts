import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AI: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
}

function buildQueryChain(docs: any[]) {
  const result = { docs: buildMockDocs(docs), empty: docs.length === 0 };
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(result),
  };
}

function buildMockDb(collectionMap: Record<string, any[]>) {
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => {
    const chain = buildQueryChain(collectionMap[name] || []);
    chain.add = vi.fn().mockResolvedValue({ id: "new-doc-id" });
    return chain;
  });
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(userDoc),
    }),
  };
}

describe("/api/ai/briefing", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("GET returns briefing with Firestore data", async () => {
    const today = new Date().toISOString().split("T")[0];

    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          dailyBriefings: [],
          monitoredProducts: [
            { productId: "p1", alerts: [{ type: "price_drop", message: "Price dropped", read: false, createdAt: new Date().toISOString() }] },
            { productId: "p2", alerts: [], stockStatus: "out_of_stock", priceHistory: [{ price: 100 }, { price: 80 }] },
          ],
          watchlist: [{ title: "Widget" }],
          profitEntries: [{ orderId: "o1", productTitle: "Widget", revenue: 49.99, platform: "Shopify", profitMargin: 35 }],
          alerts: [{ id: "a1", type: "price_drop", message: "Alert" }],
        })
      ),
    }));

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/ai/briefing");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.briefing).toBeDefined();
    expect(data.briefing.date).toBe(today);
    expect(data.briefing.stats).toBeDefined();
    expect(data.briefing.recommendations).toBeDefined();
  });

  it("GET returns cached briefing if today's exists", async () => {
    const today = new Date().toISOString().split("T")[0];

    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          dailyBriefings: [
            {
              date: today,
              summary: "Cached briefing",
              priceAlerts: [],
              stockAlerts: [],
              opportunities: [],
              topProducts: [],
              stats: { productsMonitored: 0, priceDrops: 0, priceIncreases: 0, outOfStock: 0, opportunities: 0 },
              recommendations: [],
            },
          ],
        })
      ),
    }));

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/ai/briefing");
    const response = await GET(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.briefing.date).toBe(today);
    expect(data.cached).toBe(true);
  });

  it("GET returns 500 on Firestore error", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("DB connection failed")),
    }));

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/ai/briefing");
    const response = await GET(request as any);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
