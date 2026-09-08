import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/data/budget-recommendations", () => ({
  updateBudgetRecommendation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/data/ad-campaigns", () => ({
  updateAdCampaign: vi.fn().mockResolvedValue(undefined),
}));

function makeReq(pathname: string, method: string, body?: any) {
  const req = new Request(`http://localhost${pathname}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
  (req as any).nextUrl = new URL(`http://localhost${pathname}`);
  return req;
}

describe("/api/budget-optimizer/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when status invalid", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(makeReq("/api/budget-optimizer/r1", "PATCH", { status: "maybe" }) as any);
    expect(response.status).toBe(400);
  });

  it("accepts recommendation and returns success", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(makeReq("/api/budget-optimizer/r1", "PATCH", { status: "accepted" }) as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
