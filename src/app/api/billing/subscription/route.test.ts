import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { BILLING: { windowMs: 60000, maxRequests: 10 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockGetUserSubscription = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  getUserSubscription: (...args: any[]) => mockGetUserSubscription(...args),
}));

vi.mock("@/lib/billing/types", () => ({
  getPlanByTier: vi.fn((tier: string) => ({ id: tier, name: tier })),
}));

describe("/api/billing/subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("GET returns subscription", async () => {
    mockGetUserSubscription.mockResolvedValue({ tier: "pro", status: "active" });
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/billing/subscription");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("GET returns free plan when no subscription", async () => {
    mockGetUserSubscription.mockResolvedValue(null);
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/billing/subscription");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("GET returns 500 on error", async () => {
    mockGetUserSubscription.mockRejectedValue(new Error("Stripe error"));
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/billing/subscription");
    const response = await GET(request as any);
    expect(response.status).toBe(500);
  });
});
