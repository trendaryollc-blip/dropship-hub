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

vi.mock("@/lib/data/multi-store", () => ({
  getStorePerformances: vi.fn().mockResolvedValue([]),
  saveStorePerformance: vi.fn().mockResolvedValue(undefined),
}));

describe("/api/multi-store/performance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("GET returns performances", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/multi-store/performance?period=30d");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("POST saves performance", async () => {
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
