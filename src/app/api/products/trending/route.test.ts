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

vi.mock("@/lib/platform-search", () => ({
  searchAmazon: vi.fn().mockResolvedValue({ search_results: [{ title: "Trending Earbuds", price: 15.99, image: "ear.jpg", link: "https://amazon.com", rating: 4.2, reviews: 300 }] }),
  searchGoogleShopping: vi.fn().mockResolvedValue({ search_results: [{ title: "Trending Phone Mount", price: 12.50, image: "mount.jpg", link: "https://shopping.google.com", rating: 4.0, reviews: 200 }] }),
  searchCJProducts: vi.fn().mockResolvedValue({ search_results: [{ title: "Trending LED Strip", price: 8.99, image: "led.jpg", link: "https://cj.com", rating: 4.1, reviews: 500 }] }),
  searchAliExpress: vi.fn().mockResolvedValue({ search_results: [{ title: "Trending Pet Tracker", price: 6.99, image: "pet.jpg", link: "https://aliexpress.com", rating: 3.9, reviews: 1000 }] }),
}));

import { GET } from "./route";

function makeReq() {
  return {} as any;
}

describe("GET /api/products/trending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns trending products", async () => {
    const res = await GET(makeReq(), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.products).toBeDefined();
    expect(Array.isArray(data.products)).toBe(true);
    expect(data.count).toBeDefined();
  });

  it("returns products sorted by price ascending", async () => {
    const res = await GET(makeReq(), null as any);
    const data = await res.json();
    if (data.products.length > 1) {
      for (let i = 1; i < data.products.length; i++) {
        expect(data.products[i].price).toBeGreaterThanOrEqual(data.products[i - 1].price);
      }
    }
  });

  it("returns at most 8 products", async () => {
    const res = await GET(makeReq(), null as any);
    const data = await res.json();
    expect(data.products.length).toBeLessThanOrEqual(8);
  });

  it("each product has required fields", async () => {
    const res = await GET(makeReq(), null as any);
    const data = await res.json();
    for (const p of data.products) {
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.price).toBeGreaterThan(0);
      expect(p.platform).toBeDefined();
    }
  });
});
