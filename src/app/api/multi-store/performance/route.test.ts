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

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

function mockDb(overrides: {
  connectionsDocs?: { id: string; data: () => Record<string, unknown> }[];
  orderDocs?: { id: string; data: () => Record<string, unknown> }[];
}) {
  const { connectionsDocs = [], orderDocs = [] } = overrides;
  const subCollection = vi.fn().mockImplementation((name: string) => {
    if (name === "storeConnections") {
      return { get: vi.fn().mockResolvedValue({ docs: connectionsDocs.map((d) => ({ id: d.id, data: d.data })) }) };
    }
    if (name === "fulfillmentOrders") {
      return {
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ docs: orderDocs.map((d) => ({ id: d.id, data: d.data })) }),
      };
    }
    // storePerformances
    return {
      doc: vi.fn().mockReturnValue({ set: vi.fn().mockResolvedValue(undefined) }),
    };
  });
  return {
    collection: vi.fn().mockImplementation(() => ({
      doc: vi.fn().mockReturnValue({ collection: subCollection }),
    })),
  };
}

describe("/api/multi-store/performance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("GET computes performances from fulfillmentOrders", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(mockDb({
      connectionsDocs: [{ id: "s1", data: () => ({ name: "Store One", platform: "shopify" }) }],
      orderDocs: [
        { id: "o1", data: () => ({ storeId: "s1", totalRevenue: 100, profit: 30, status: "shipped", createdAt: new Date().toISOString() }) },
        { id: "o2", data: () => ({ storeId: "s1", totalRevenue: 50, profit: 15, status: "pending", createdAt: new Date(Date.now() - 40 * 86400000).toISOString() }) },
      ],
    }));

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/multi-store/performance?period=30d");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    // Only the current window (last 30 days) counts toward the metrics.
    expect(data.performances).toHaveLength(1);
    expect(data.performances[0].storeId).toBe("s1");
    expect(data.performances[0].metrics.totalOrders).toBe(1);
    expect(data.performances[0].metrics.totalRevenue).toBe(100);
    expect(data.performances[0].metrics.totalProfit).toBe(30);
    expect(data.performances[0].metrics.fulfillmentRate).toBe(100);
  });

  it("GET returns empty list when no stores have orders", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(mockDb({
      connectionsDocs: [{ id: "s1", data: () => ({ name: "Store One", platform: "shopify" }) }],
    }));

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/multi-store/performance?period=30d");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.performances).toEqual([]);
  });

  it("POST saves performance", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(mockDb({}));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/multi-store/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: "s1", storeName: "Store", metrics: { revenue: 100 } }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST returns 400 for missing fields", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(mockDb({}));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/multi-store/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: "s1" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });
});
