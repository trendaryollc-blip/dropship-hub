import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { BILLING: { windowMs: 60000, maxRequests: 10 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockCreateCheckoutSession = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  createCheckoutSession: (...args: any[]) => mockCreateCheckoutSession(...args),
}));

vi.mock("@/lib/billing/types", () => ({
  getPlanByTier: vi.fn((tier: string) => ({
    name: tier,
    stripePriceIdMonthly: `price_monthly_${tier}`,
    stripePriceIdYearly: `price_yearly_${tier}`,
  })),
  BILLING_PLANS: [{ id: "free" }, { id: "pro" }, { id: "enterprise" }],
}));

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet, set: mockSet, id: "test-user-123" }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection }),
}));

describe("/api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCreateCheckoutSession.mockResolvedValue({ sessionId: "cs_test", url: "https://checkout.stripe.com/test" });
    mockGet.mockResolvedValue({ exists: true, data: () => ({ email: "test@example.com" }) });
  });

  it("POST creates checkout session", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "pro", interval: "month" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST returns 400 for invalid tier", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "invalid" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST returns 400 for invalid interval", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "pro", interval: "weekly" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("GET returns billing plans", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/billing/checkout");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });
});
