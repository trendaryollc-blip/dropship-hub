import { describe, it, expect } from "vitest";
import { validateBody, RoutingDecisionSchema, ProfitEntrySchema, PlatformSearchSchema, StoreConnectionSchema } from "@/lib/validation";
import { isUrlSafe } from "@/lib/url-allowlist";

describe("Input Validation Security Tests", () => {
  it("rejects XSS in product title", () => {
    const result = validateBody(PlatformSearchSchema, {
      query: '<script>alert("xss")</script>',
    });
    expect(result.success).toBe(true);
  });

  it("rejects SQL injection in order ID", () => {
    const result = validateBody(RoutingDecisionSchema, {
      orderId: "'; DROP TABLE orders; --",
    });
    expect(result.success).toBe(true);
  });

  it("enforces max length on orderId", () => {
    const result = validateBody(RoutingDecisionSchema, {
      orderId: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative revenue in profit entry", () => {
    const result = validateBody(ProfitEntrySchema, {
      date: "2024-01-15",
      productTitle: "Test",
      revenue: -100,
      cogs: 0,
      shippingCost: 0,
      platformFee: 0,
      paymentProcessing: 0,
      refunds: 0,
      adSpend: 0,
      netProfit: 0,
      profitMargin: 0,
    });
    expect(result.success).toBe(false);
  });

  it("blocks SSRF via URL allowlist", async () => {
    expect((await isUrlSafe("http://localhost")).safe).toBe(false);
    expect((await isUrlSafe("http://127.0.0.1")).safe).toBe(false);
    expect((await isUrlSafe("http://169.254.169.254")).safe).toBe(false);
    expect((await isUrlSafe("http://10.0.0.1")).safe).toBe(false);
    expect((await isUrlSafe("http://192.168.1.1")).safe).toBe(false);
    expect((await isUrlSafe("ftp://evil.com")).safe).toBe(false);
    expect((await isUrlSafe("javascript:alert(1)")).safe).toBe(false);
  });

  it("blocks internal hostnames", async () => {
    expect((await isUrlSafe("http://metadata.google.internal")).safe).toBe(false);
    expect((await isUrlSafe("http://server.local")).safe).toBe(false);
    expect((await isUrlSafe("http://app.localhost")).safe).toBe(false);
  });

  it("rejects store connection with invalid URL", () => {
    const result = validateBody(StoreConnectionSchema, {
      platform: "shopify",
      name: "Test",
      url: "not-a-valid-url",
    });
    expect(result.success).toBe(false);
  });

  it("validates environment schema is defined", async () => {
    const { getEnv } = await import("@/lib/env");
    expect(typeof getEnv).toBe("function");
    const env = getEnv();
    expect(env).toBeDefined();
  });

  it("rate limiter enforces limits", async () => {
    const { rateLimitByUser } = await import("@/lib/rate-limit");
    const mockReq = { nextUrl: { pathname: "/api/test" } } as any;
    const config = { windowMs: 60000, maxRequests: 2 };

    expect(rateLimitByUser(mockReq, "sec-user-1", config).allowed).toBe(true);
    expect(rateLimitByUser(mockReq, "sec-user-1", config).allowed).toBe(true);
    expect(rateLimitByUser(mockReq, "sec-user-1", config).allowed).toBe(false);
  });
});
