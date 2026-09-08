import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const mockConstructEvent = vi.fn();
const mockGetStripe = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  getStripe: (...args: any[]) => mockGetStripe(...args),
  handleCheckoutCompleted: vi.fn().mockResolvedValue(undefined),
  handleSubscriptionUpdated: vi.fn().mockResolvedValue(undefined),
  handleSubscriptionDeleted: vi.fn().mockResolvedValue(undefined),
}));

function makeReq(url: string, init?: RequestInit) {
  const req = new Request(url, init);
  (req as any).nextUrl = new URL(url);
  return req;
}

describe("/api/billing/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.STRIPE_WEBHOOK_SECRET;
    mockGetStripe.mockReturnValue({
      webhooks: { constructEvent: mockConstructEvent },
    });
  });

  it("returns 400 when no stripe-signature header", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const { POST } = await import("./route");
    const response = await POST(makeReq("http://localhost/api/billing/webhook", {
      method: "POST",
      body: "test-body",
    }) as any);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Missing signature or secret");
  });

  it("returns 400 when STRIPE_WEBHOOK_SECRET not set", async () => {
    const { POST } = await import("./route");
    const response = await POST(makeReq("http://localhost/api/billing/webhook", {
      method: "POST",
      body: "test-body",
      headers: { "stripe-signature": "sig_test" },
    }) as any);

    expect(response.status).toBe(400);
  });

  it("returns 400 when signature verification fails", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const { POST } = await import("./route");
    const response = await POST(makeReq("http://localhost/api/billing/webhook", {
      method: "POST",
      body: "test-body",
      headers: { "stripe-signature": "sig_test" },
    }) as any);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Invalid signature");
  });

  it("handles checkout.session.completed event", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_test" } },
    });

    const { POST, handleCheckoutCompleted } = await import("./route") as any;
    const { POST: POSTFn } = await import("./route");
    const response = await POSTFn(makeReq("http://localhost/api/billing/webhook", {
      method: "POST",
      body: "test-body",
      headers: { "stripe-signature": "sig_test" },
    }) as any);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.received).toBe(true);
  });
});
