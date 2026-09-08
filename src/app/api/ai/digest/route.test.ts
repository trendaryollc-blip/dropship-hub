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
const mockAddFn = vi.fn().mockResolvedValue({ id: "digest-1" });

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({
    collection: mockCollectionFn,
  }),
}));

function mockFirestoreDigest(scans: Record<string, any[]>, userData: Record<string, any> = {}) {
  mockCollectionFn.mockReturnValue({
    doc: vi.fn().mockReturnValue({
      collection: vi.fn().mockImplementation((name: string) => {
        const docs = (scans[name] || []).map((d) => ({ data: () => d }));
        return {
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ docs }),
          add: name === "digests" ? mockAddFn : vi.fn().mockResolvedValue({ id: "doc-1" }),
        };
      }),
      get: vi.fn().mockResolvedValue({
        exists: Object.keys(userData).length > 0,
        data: () => userData,
      }),
    }),
  });
}

describe("/api/ai/digest", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAddFn.mockClear();
  });

  it("POST generates weekly digest with data", async () => {
    mockFirestoreDigest(
      {
        revenue: [{ amount: 500 }, { amount: 300 }],
        profitEntries: [
          { netProfit: 200, revenue: 300, productName: "Widget A", campaignName: "Facebook Ads", adSpend: 50 },
          { netProfit: 150, revenue: 250, productName: "Widget B", campaignName: "Facebook Ads", adSpend: 30 },
          { netProfit: 50, revenue: 150, productName: "Widget A", campaignName: "Google Ads", adSpend: 40 },
        ],
        alerts: [{ severity: "warning", text: "Stock running low" }],
        productLifecycle: [],
      },
      { displayName: "Test User", email: "test@example.com" }
    );

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/digest", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.digest).toBeDefined();
    expect(data.digest.weeklyRevenue).toBe(800);
    expect(data.digest.weeklyProfit).toBe(400);
    expect(data.digest.weeklyOrders).toBe(3);
    expect(data.digest.topProducts.length).toBeGreaterThan(0);
    expect(data.digest.topCampaigns.length).toBeGreaterThan(0);
    expect(data.digest.recommendations.length).toBeGreaterThan(0);
    expect(data.emailHTML).toBeDefined();
    expect(data.emailHTML).toContain("Weekly Digest");
    expect(mockAddFn).toHaveBeenCalled();
  });

  it("POST returns empty digest when no data", async () => {
    mockFirestoreDigest(
      {
        revenue: [],
        profitEntries: [],
        alerts: [],
        productLifecycle: [],
      },
      {}
    );

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/digest", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.digest.weeklyRevenue).toBe(0);
    expect(data.digest.weeklyOrders).toBe(0);
  });

  it("POST includes top products sorted by revenue", async () => {
    mockFirestoreDigest(
      {
        revenue: [],
        profitEntries: [
          { netProfit: 50, revenue: 100, productName: "Cheap Item", campaignName: "Organic", adSpend: 0 },
          { netProfit: 200, revenue: 500, productName: "Best Seller", campaignName: "Organic", adSpend: 0 },
          { netProfit: 100, revenue: 300, productName: "Mid Item", campaignName: "Organic", adSpend: 0 },
        ],
        alerts: [],
        productLifecycle: [],
      },
      { displayName: "User" }
    );

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/digest", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.digest.topProducts[0].name).toBe("Best Seller");
    expect(data.digest.topProducts[0].revenue).toBe(500);
  });

  it("POST includes alerts in digest", async () => {
    mockFirestoreDigest(
      {
        revenue: [],
        profitEntries: [],
        alerts: [
          { severity: "critical", text: "Payment failed" },
          { severity: "warning", text: "Low stock on 3 items" },
        ],
        productLifecycle: [],
      },
      { displayName: "User" }
    );

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/digest", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.digest.alerts.length).toBe(2);
    expect(data.digest.alerts[0].severity).toBe("critical");
  });

  it("POST returns 500 on Firestore error", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockRejectedValue(new Error("DB down"));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/digest", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to generate digest");
  });
});
