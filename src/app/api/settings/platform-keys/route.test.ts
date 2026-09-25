import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

describe("/api/settings/platform-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SERPAPI_KEYS;
    delete process.env.SERPAPI_KEY;
    delete process.env.CJ_API_KEYS;
    delete process.env.CJ_API_KEY;
  });

  it("GET returns provider pool status without key material", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/settings/platform-keys");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.providers).toBeDefined();
    expect(data.providers.serpapi).toMatchObject({
      poolEnvVar: "SERPAPI_KEYS",
      configured: false,
      keyCount: 0,
    });
    expect(data.providers.serpapi.getKeyUrl).toContain("serpapi.com");
    const serialized = JSON.stringify(data);
    expect(serialized).not.toMatch(/sk-|key123/);
  });

  it("reports configured when pool env var is set", async () => {
    process.env.SERPAPI_KEYS = "key-one,key-two";
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/settings/platform-keys");
    const response = await GET(request as any);
    const data = await response.json();
    expect(data.providers.serpapi.configured).toBe(true);
    expect(data.providers.serpapi.keyCount).toBe(2);
    expect(JSON.stringify(data)).not.toContain("key-one");
  });

  it("falls back to legacy single-key alias", async () => {
    process.env.CJ_API_KEY = "legacy-cj-key";
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/settings/platform-keys");
    const response = await GET(request as any);
    const data = await response.json();
    expect(data.providers.cj.configured).toBe(true);
    expect(data.providers.cj.keyCount).toBe(1);
    expect(JSON.stringify(data)).not.toContain("legacy-cj-key");
  });
});
