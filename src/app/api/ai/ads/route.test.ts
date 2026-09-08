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

const mockCollectionFn = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({
    collection: mockCollectionFn,
  }),
}));

function mockFirestoreProfitEntries(entries: any[]) {
  const docs = entries.map((d) => ({ data: () => d }));
  mockCollectionFn.mockReturnValue({
    doc: vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ docs }),
          }),
        }),
      }),
    }),
  });
}

describe("/api/ai/ads", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("POST returns empty state when no profit entries", async () => {
    mockFirestoreProfitEntries([]);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/ads", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.campaigns).toHaveLength(0);
    expect(data.summary.totalAdSpend).toBe(0);
    expect(data.insights.length).toBeGreaterThan(0);
  });

  it("POST analyzes campaigns with ad spend", async () => {
    mockFirestoreProfitEntries([
      { campaignName: "Facebook Campaign A", adSpend: 100, revenue: 400, netProfit: 200 },
      { campaignName: "Facebook Campaign A", adSpend: 100, revenue: 350, netProfit: 150 },
      { campaignName: "Google Ads B", adSpend: 200, revenue: 300, netProfit: -50 },
    ]);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/ads", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.campaigns.length).toBe(2);
    expect(data.summary.totalAdSpend).toBe(400);
    expect(data.summary.totalRevenue).toBe(1050);
    expect(data.summary.overallROAS).toBeGreaterThan(0);
    expect(data.summary.bestCampaign).toBeDefined();
    expect(data.summary.worstCampaign).toBeDefined();
    expect(data.summary.budgetRecommendation).toBeDefined();
    expect(data.generatedAt).toBeDefined();
  });

  it("POST correctly rates excellent ROAS campaign", async () => {
    mockFirestoreProfitEntries([
      { campaignName: "Top Performer", adSpend: 50, revenue: 250, netProfit: 150 },
    ]);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/ads", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.campaigns[0].rating).toBe("excellent");
    expect(data.campaigns[0].roas).toBe(5);
  });

  it("POST correctly rates stop-worthy campaign", async () => {
    mockFirestoreProfitEntries([
      { campaignName: "Loser Campaign", adSpend: 200, revenue: 50, netProfit: -200 },
    ]);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/ads", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.campaigns[0].rating).toBe("stop");
    expect(data.campaigns[0].roas).toBeLessThan(1);
  });

  it("POST skips organic entries with zero ad spend", async () => {
    mockFirestoreProfitEntries([
      { campaignName: "Organic", adSpend: 0, revenue: 100, netProfit: 100 },
      { campaignName: "Paid Ad", adSpend: 50, revenue: 150, netProfit: 50 },
    ]);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/ads", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.campaigns.length).toBe(1);
    expect(data.campaigns[0].name).toBe("Paid Ad");
  });

  it("POST returns 500 on Firestore error", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockRejectedValue(new Error("DB error"));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/ads", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to analyze ad campaigns");
  });
});
