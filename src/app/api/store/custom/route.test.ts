import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/url-allowlist", () => ({
  isUrlSafe: vi.fn().mockResolvedValue({ safe: true }),
}));

describe("GET /api/store/custom", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns platform info", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/store/custom");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.platform).toBe("Custom Store");
    expect(json.supportedActions).toContain("test");
  });
});

describe("POST /api/store/custom", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when store URL is missing", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/store/custom", {
      method: "POST",
      body: JSON.stringify({ action: "test" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Store URL is required");
  });

  it("returns 400 for invalid action", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/store/custom", {
      method: "POST",
      body: JSON.stringify({ action: "invalid", url: "https://example.com" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid action");
  });
});
