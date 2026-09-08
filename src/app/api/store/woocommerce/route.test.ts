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

describe("GET /api/store/woocommerce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.WOOCOMMERCE_URL;
    delete process.env.WOOCOMMERCE_CONSUMER_KEY;
    delete process.env.WOOCOMMERCE_CONSUMER_SECRET;
  });

  it("returns configured status", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/store/woocommerce");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.platform).toBe("WooCommerce");
    expect(json.configured).toBe(false);
  });
});

describe("POST /api/store/woocommerce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.WOOCOMMERCE_URL;
    delete process.env.WOOCOMMERCE_CONSUMER_KEY;
    delete process.env.WOOCOMMERCE_CONSUMER_SECRET;
  });

  it("returns 503 when WooCommerce is not configured", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/store/woocommerce", {
      method: "POST",
      body: JSON.stringify({ action: "products" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error).toContain("WooCommerce not configured");
  });

  it("returns 400 for invalid action", async () => {
    process.env.WOOCOMMERCE_URL = "https://woo.example.com";
    process.env.WOOCOMMERCE_CONSUMER_KEY = "ck_test";
    process.env.WOOCOMMERCE_CONSUMER_SECRET = "cs_test";

    global.fetch = vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve("error") });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/store/woocommerce", {
      method: "POST",
      body: JSON.stringify({ action: "unknown" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid action");
  });
});
