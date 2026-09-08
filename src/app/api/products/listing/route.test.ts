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

import { POST } from "./route";

function makeReq(body: any) {
  return { json: async () => body } as any;
}

describe("POST /api/products/listing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeReq({}), null as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("title");
  });

  it("generates a listing suggestion for a valid product", async () => {
    const res = await POST(makeReq({ title: "Wireless Mouse", category: "Electronics", price: 29.99 }), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBeDefined();
    expect(data.description).toBeDefined();
    expect(data.tags).toBeDefined();
    expect(data.suggestedPriceRange).toBeDefined();
    expect(data.platformTips).toBeDefined();
    expect(data.platformTips.length).toBeGreaterThan(0);
  });

  it("uses default price when price is not a number", async () => {
    const res = await POST(makeReq({ title: "LED Strip" }), null as any);
    const data = await res.json();
    expect(data.suggestedPriceRange).toContain("$");
  });

  it("includes tips for Amazon, Shopify, and eBay", async () => {
    const res = await POST(makeReq({ title: "Phone Case", category: "Accessories", price: 15 }), null as any);
    const data = await res.json();
    const platforms = data.platformTips.map((t: any) => t.platform);
    expect(platforms).toContain("Amazon");
    expect(platforms).toContain("Shopify");
    expect(platforms).toContain("eBay");
  });
});
