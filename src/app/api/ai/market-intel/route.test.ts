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

  it("returns empty signals when no live source is connected", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/market-intel");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.trending).toHaveLength(0);
    expect(body.alerts).toHaveLength(0);
    expect(body.signals).toHaveLength(0);
    expect(body.source).toBe("unavailable");
  });

  it("returns no fabricated trending products", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/market-intel");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.trending).toEqual([]);
    expect(body.alerts).toEqual([]);
  });

  it("includes notice about the missing live source", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/market-intel");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.notice).toContain("not connected");
    expect(body.notice).toContain("SerpAPI");
  });
});
