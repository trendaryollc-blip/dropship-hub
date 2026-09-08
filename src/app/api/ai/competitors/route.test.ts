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

describe("POST /api/ai/competitors", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns competitor changes and watchlist", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          watchlist: [{ id: "w1", title: "Competitor A", platforms: ["Amazon"] }],
          competitorSearches: [{ query: "wireless earbuds" }],
          monitoredProducts: [],
          pushedProducts: [],
        })
      ),
    }));

    const { POST } = await import("./route");
    const req = { json: vi.fn() } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(body.watchList).toHaveLength(1);
    expect(body.watchList[0].name).toBe("Competitor A");
    expect(body.summary).toBeDefined();
    expect(body.generatedAt).toBeDefined();
  });

  it("detects price drops in monitored products", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          watchlist: [],
          competitorSearches: [],
          monitoredProducts: [{
            id: "p1",
            source: "AliExpress",
            title: "LED Strip",
            priceHistory: [
              { price: 10, date: "2026-01-01" },
              { price: 8, date: "2026-01-02" },
            ],
          }],
          pushedProducts: [],
        })
      ),
    }));

    const { POST } = await import("./route");
    const req = { json: vi.fn() } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(body.changes.length).toBeGreaterThan(0);
    expect(body.changes[0].changeType).toBe("price-drop");
    expect(body.changes[0].severity).toBe("warning");
  });

  it("detects out-of-stock pushed products as critical", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          watchlist: [],
          competitorSearches: [],
          monitoredProducts: [],
          pushedProducts: [{
            id: "o1",
            supplier: "Supplier X",
            title: "Product Y",
            stockStatus: "out_of_stock",
          }],
        })
      ),
    }));

    const { POST } = await import("./route");
    const req = { json: vi.fn() } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(body.changes.some((c: any) => c.changeType === "out-of-stock")).toBe(true);
    expect(body.summary.critical).toBeGreaterThan(0);
  });

  it("returns empty data when no Firestore docs exist", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));

    const { POST } = await import("./route");
    const req = { json: vi.fn() } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(body.changes).toEqual([]);
    expect(body.watchList).toEqual([]);
    expect(body.summary.totalChanges).toBe(0);
  });
});
