import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: {
    AI: { windowMs: 60000, maxRequests: 30 },
    AI_CHAT: { windowMs: 60000, maxRequests: 30 },
    DEFAULT: { windowMs: 60000, maxRequests: 60 },
  },
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

describe("POST /api/ai/report", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("generates a weekly report with all sections", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockImplementation((name: string) => {
              const data: Record<string, any[]> = {
                revenue: [{ amount: 1000, orders: 10, date: "2026-09-01" }],
                productLifecycle: [{ currentStage: "winning" }],
                supplierPerformance: [{ reliabilityScore: 85, refundRate: 0.02 }],
                supplierAlerts: [],
                csConversations: [{ status: "resolved" }],
                alerts: [],
                routingDecisions: [{ shippingDays: 8 }],
                profitEntries: [{ netProfit: 200, revenue: 1000, date: "2026-09-01" }],
              };
              if (name === "reports") {
                return { add: vi.fn().mockResolvedValue(undefined) };
              }
              return buildQueryChain(data[name] || []);
            }),
          }),
        }),
      }),
    }));

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ period: "weekly" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.period).toBe("weekly");
    expect(body.sections).toBeDefined();
    expect(body.sections.length).toBe(6);
    expect(body.healthScore).toBeGreaterThanOrEqual(0);
    expect(body.healthScore).toBeLessThanOrEqual(100);
    expect(body.highlights).toBeDefined();
    expect(body.concerns).toBeDefined();
    expect(body.recommendations).toBeDefined();
  });

  it("defaults to weekly period when not specified", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockImplementation((name: string) => {
              if (name === "reports") {
                return { add: vi.fn().mockResolvedValue(undefined) };
              }
              return buildQueryChain([]);
            }),
          }),
        }),
      }),
    }));

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({}) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.period).toBe("weekly");
  });

  it("returns 500 on Firestore error", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("Firestore unavailable")),
    }));

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({}) } as any;
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
