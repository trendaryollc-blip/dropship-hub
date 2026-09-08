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
  getAdCampaignById: vi.fn().mockResolvedValue({ id: "c1", name: "Test Campaign" }),
  updateAdCampaign: vi.fn().mockResolvedValue(undefined),
  deleteAdCampaign: vi.fn().mockResolvedValue(undefined),
}));

function makeReq(pathname: string, method: string, body?: any) {
  const req = new Request(`http://localhost${pathname}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
  (req as any).nextUrl = new URL(`http://localhost${pathname}`);
  return req;
}

describe("/api/ad-campaigns/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns campaign", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeReq("/api/ad-campaigns/c1", "GET") as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.campaign.id).toBe("c1");
  });

  it("GET returns 404 when not found", async () => {
    const { getAdCampaignById } = await import("@/lib/data/ad-campaigns");
    (getAdCampaignById as any).mockResolvedValueOnce(null);
    const { GET } = await import("./route");
    const response = await GET(makeReq("/api/ad-campaigns/missing", "GET") as any);
    expect(response.status).toBe(404);
  });

  it("PATCH updates and returns success", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(makeReq("/api/ad-campaigns/c1", "PATCH", { name: "Updated" }) as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("DELETE removes and returns success", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(makeReq("/api/ad-campaigns/c1", "DELETE") as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
