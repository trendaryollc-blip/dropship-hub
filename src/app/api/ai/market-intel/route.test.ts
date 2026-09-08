import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AI: { windowMs: 60000, maxRequests: 30 }, AI_CHAT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

describe("GET /api/ai/market-intel", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns trending products and alerts", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/market-intel");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.trending).toHaveLength(5);
    expect(body.alerts).toHaveLength(4);
    expect(body.isMock).toBe(true);
  });

  it("trending items have required fields", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/market-intel");
    const res = await GET(req as any);
    const body = await res.json();

    const first = body.trending[0];
    expect(first.id).toBeDefined();
    expect(first.name).toBeDefined();
    expect(typeof first.trend).toBe("number");
    expect(typeof first.price).toBe("number");
    expect(typeof first.margin).toBe("number");
    expect(first.platform).toBeDefined();
  });

  it("alerts have required fields", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/market-intel");
    const res = await GET(req as any);
    const body = await res.json();

    const first = body.alerts[0];
    expect(first.id).toBeDefined();
    expect(first.type).toBeDefined();
    expect(first.text).toBeDefined();
    expect(first.value).toBeDefined();
  });

  it("includes notice about mock data", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/market-intel");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.notice).toContain("mock data");
  });
});
