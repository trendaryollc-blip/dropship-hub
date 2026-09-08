import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const mockGetUserTier = vi.fn();
const mockGetUsage = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  getUserTier: (...args: any[]) => mockGetUserTier(...args),
  getUsage: (...args: any[]) => mockGetUsage(...args),
}));

const mockGetUsageLimit = vi.fn();
vi.mock("@/lib/billing/types", () => ({
  getUsageLimit: (...args: any[]) => mockGetUsageLimit(...args),
}));

function makeReq(url: string) {
  const req = new Request(url);
  (req as any).nextUrl = new URL(url);
  return req;
}

describe("/api/billing/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetUserTier.mockResolvedValue("pro");
    mockGetUsage.mockResolvedValue(42);
    mockGetUsageLimit.mockReturnValue(100);
  });

  it("GET returns tier and usage object", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeReq("http://localhost/api/billing/usage") as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.tier).toBe("pro");
    expect(json.usage).toBeDefined();
    expect(json.usage.ai_calls).toEqual({ used: 42, limit: 100, percentage: 42 });
    expect(json.usage.api_calls).toEqual({ used: 42, limit: 100, percentage: 42 });
    expect(json.usage.webhook_calls).toEqual({ used: 42, limit: 100, percentage: 42 });
    expect(json.usage.products).toEqual({ used: 42, limit: 100, percentage: 42 });
    expect(json.usage.store_pushes).toEqual({ used: 42, limit: 100, percentage: 42 });
  });

  it("GET handles unlimited tier (-1 limit)", async () => {
    mockGetUsageLimit.mockReturnValue(-1);

    const { GET } = await import("./route");
    const response = await GET(makeReq("http://localhost/api/billing/usage") as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.usage.ai_calls.limit).toBe(Infinity);
    expect(json.usage.ai_calls.percentage).toBe(0);
  });

  it("GET returns 500 on error", async () => {
    mockGetUserTier.mockRejectedValue(new Error("Stripe error"));

    const { GET } = await import("./route");
    const response = await GET(makeReq("http://localhost/api/billing/usage") as any);

    expect(response.status).toBe(500);
  });
});
