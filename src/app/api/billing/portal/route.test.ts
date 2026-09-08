import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { BILLING: { windowMs: 60000, maxRequests: 10 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockCreateCustomerPortalSession = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  createCustomerPortalSession: (...args: any[]) => mockCreateCustomerPortalSession(...args),
}));

describe("/api/billing/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("POST creates portal session", async () => {
    mockCreateCustomerPortalSession.mockResolvedValue({ url: "https://billing.stripe.com/session/test" });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/billing/portal", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST returns 500 on error", async () => {
    mockCreateCustomerPortalSession.mockRejectedValue(new Error("Stripe error"));
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/billing/portal", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(500);
  });
});
