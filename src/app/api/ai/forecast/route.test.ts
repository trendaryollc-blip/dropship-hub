import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AI_CHAT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/utils-helpers", () => ({
  safeNum: (v: unknown, fallback = 0) => (typeof v === "number" ? v : fallback),
  safeStr: (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ data: () => d }));
}

function buildQueryChain(docs: any[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs) }),
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

describe("/api/ai/forecast", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("POST returns forecast with default 14 days", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          revenue: [
            { date: "2026-08-01", amount: 150, orders: 8 },
            { date: "2026-08-02", amount: 165, orders: 10 },
            { date: "2026-08-03", amount: 140, orders: 7 },
            { date: "2026-08-04", amount: 180, orders: 12 },
            { date: "2026-08-05", amount: 155, orders: 9 },
            { date: "2026-08-06", amount: 170, orders: 11 },
            { date: "2026-08-07", amount: 160, orders: 10 },
            { date: "2026-08-08", amount: 185, orders: 13 },
            { date: "2026-08-09", amount: 175, orders: 12 },
            { date: "2026-08-10", amount: 190, orders: 14 },
            { date: "2026-08-11", amount: 165, orders: 10 },
            { date: "2026-08-12", amount: 200, orders: 15 },
            { date: "2026-08-13", amount: 195, orders: 14 },
            { date: "2026-08-14", amount: 210, orders: 16 },
            { date: "2026-08-15", amount: 185, orders: 13 },
            { date: "2026-08-16", amount: 205, orders: 15 },
            { date: "2026-08-17", amount: 195, orders: 14 },
            { date: "2026-08-18", amount: 215, orders: 16 },
            { date: "2026-08-19", amount: 200, orders: 15 },
            { date: "2026-08-20", amount: 220, orders: 17 },
            { date: "2026-08-21", amount: 210, orders: 16 },
            { date: "2026-08-22", amount: 225, orders: 17 },
            { date: "2026-08-23", amount: 215, orders: 16 },
            { date: "2026-08-24", amount: 230, orders: 18 },
            { date: "2026-08-25", amount: 220, orders: 17 },
            { date: "2026-08-26", amount: 235, orders: 18 },
            { date: "2026-08-27", amount: 225, orders: 17 },
            { date: "2026-08-28", amount: 240, orders: 19 },
            { date: "2026-08-29", amount: 230, orders: 18 },
            { date: "2026-08-30", amount: 245, orders: 19 },
          ],
          profitEntries: [
            { date: "2026-08-28", netProfit: 72 },
            { date: "2026-08-29", netProfit: 69 },
            { date: "2026-08-30", netProfit: 74 },
          ],
        })
      ),
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/forecast", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.forecast).toBeDefined();
    expect(data.forecast.length).toBeGreaterThan(0);
    expect(data.summary).toBeDefined();
    expect(data.summary.currentTrend).toMatch(/growing|declining|stable/);
    expect(data.insights).toBeDefined();
    expect(data.generatedAt).toBeDefined();
  });

  it("POST returns forecast with custom days", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          revenue: [
            { date: "2026-08-01", amount: 150, orders: 8 },
            { date: "2026-08-02", amount: 165, orders: 10 },
            { date: "2026-08-03", amount: 140, orders: 7 },
            { date: "2026-08-04", amount: 180, orders: 12 },
            { date: "2026-08-05", amount: 155, orders: 9 },
            { date: "2026-08-06", amount: 170, orders: 11 },
            { date: "2026-08-07", amount: 160, orders: 10 },
            { date: "2026-08-08", amount: 185, orders: 13 },
            { date: "2026-08-09", amount: 175, orders: 12 },
            { date: "2026-08-10", amount: 190, orders: 14 },
            { date: "2026-08-11", amount: 165, orders: 10 },
            { date: "2026-08-12", amount: 200, orders: 15 },
            { date: "2026-08-13", amount: 195, orders: 14 },
            { date: "2026-08-14", amount: 210, orders: 16 },
            { date: "2026-08-15", amount: 185, orders: 13 },
            { date: "2026-08-16", amount: 205, orders: 15 },
            { date: "2026-08-17", amount: 195, orders: 14 },
            { date: "2026-08-18", amount: 215, orders: 16 },
            { date: "2026-08-19", amount: 200, orders: 15 },
            { date: "2026-08-20", amount: 220, orders: 17 },
          ],
          profitEntries: [],
        })
      ),
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/forecast", {
      method: "POST",
      body: JSON.stringify({ days: 7 }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.forecast).toBeDefined();
    const futurePoints = data.forecast.filter((f: any) => f.actual === null);
    expect(futurePoints.length).toBe(7);
  });

  it("POST returns empty forecast with insufficient data", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/forecast", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.forecast).toEqual([]);
    expect(data.insights.join(" ")).toContain("Not enough revenue data to generate a forecast");
  });

  it("POST returns 500 on Firestore error", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("DB connection failed")),
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/forecast", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to generate forecast");
  });
});
