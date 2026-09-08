import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 }, PRODUCT_ENRICH: { windowMs: 60000, maxRequests: 20 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/platform-search", () => ({
  searchAmazon: vi.fn().mockResolvedValue({ search_results: [{ title: "Amazon Item", price: 29.99, rating: 4.5, reviews: 100, link: "https://amazon.com/dp/B0123" }] }),
  searchGoogleShopping: vi.fn().mockResolvedValue({ search_results: [] }),
  searchCJProducts: vi.fn().mockResolvedValue({ search_results: [] }),
  searchKeepaProducts: vi.fn().mockResolvedValue({ search_results: [] }),
  searchAliExpress: vi.fn().mockResolvedValue({ search_results: [] }),
}));

vi.mock("@/lib/supplier-service", () => ({
  getSuppliers: vi.fn().mockResolvedValue([
    { id: "s1", name: "Supplier One", trustBadge: "Gold", location: "China", flag: "🇨🇳", catalog: { categories: ["all"] }, stats: { shippingDays: 5, shippingDaysEU: 7, reliabilityScore: 90, responseTime: "2h" } },
  ]),
}));

import { POST } from "./route";
import { getSuppliers } from "@/lib/supplier-service";

function makeReq(body: any) {
  return { json: async () => body } as any;
}

describe("POST /api/products/enrich", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeReq({}), null as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("title");
  });

  it("enriches a product with platform prices", async () => {
    const res = await POST(makeReq({ title: "Wireless Earbuds", source: "Amazon", price: 30 }), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.platforms).toBeDefined();
    expect(Array.isArray(data.platforms)).toBe(true);
    expect(data.cheapest).toBeDefined();
    expect(data.mostExpensive).toBeDefined();
    expect(data.priceSpread).toBeGreaterThanOrEqual(0);
  });

  it("uses mock data when fewer than 3 unique platforms return results", async () => {
    const res = await POST(makeReq({ title: "Rare Gadget", price: 20 }), null as any);
    const data = await res.json();
    expect(data.hasMockData).toBe(true);
    expect(data.platforms.length).toBeGreaterThan(1);
  });

  it("calls supplier service and returns supplier matches", async () => {
    await POST(makeReq({ title: "Wireless Earbuds", price: 30 }), null as any);
    expect(getSuppliers).toHaveBeenCalled();
  });
});
