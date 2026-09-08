import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/data/ad-campaigns", () => ({
  getAdCampaigns: vi.fn().mockResolvedValue([]),
  updateAdCampaign: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/data/ad-connections", () => ({
  getAdConnectionByPlatform: vi.fn().mockResolvedValue({ accessToken: "tok", accountId: "acc" }),
}));

vi.mock("@/lib/ad-platforms", () => ({
  getAdapter: vi.fn(() => ({
    getCampaignMetrics: vi.fn().mockResolvedValue({ impressions: 1000, clicks: 50 }),
  })),
}));

describe("/api/ad-campaigns/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when campaignId missing", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ad-campaigns/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "facebook" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/ad-campaigns/sync");
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("returns 400 when platform invalid", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ad-campaigns/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: "c1", platform: "tiktok" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/ad-campaigns/sync");
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("syncs and returns metrics", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ad-campaigns/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: "c1", platform: "facebook" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/ad-campaigns/sync");
    const response = await POST(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.metrics).toEqual({ impressions: 1000, clicks: 50 });
  });
});
