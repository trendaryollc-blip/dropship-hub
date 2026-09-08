import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { BILLING: { windowMs: 60000, maxRequests: 10 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

describe("/api/store/shopify", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv, SHOPIFY_STORE_DOMAIN: "test-store.myshopify.com", SHOPIFY_ACCESS_TOKEN: "shpat_test_token" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("POST proxies to Shopify (shop action)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ shop: { name: "Test Store" } }),
    }));
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/store/shopify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "shop" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST returns 400 for invalid action", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/store/shopify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invalid" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST returns 503 when Shopify not configured", async () => {
    process.env.SHOPIFY_STORE_DOMAIN = "";
    process.env.SHOPIFY_ACCESS_TOKEN = "";
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/store/shopify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "shop" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(503);
  });

  it("POST returns 500 on Shopify API error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal error"),
    }));
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/store/shopify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "shop" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(500);
  });

  it("GET returns platform info", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/store/shopify");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });
});
