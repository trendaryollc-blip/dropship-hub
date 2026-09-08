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
  searchAmazon: vi.fn().mockResolvedValue({ search_results: [{ title: "Similar Amazon Item", price: 19.99, image: "img.jpg", link: "https://amazon.com", rating: 4.3, reviews: 200 }] }),
  searchGoogleShopping: vi.fn().mockResolvedValue({ search_results: [{ title: "Similar Google Item", price: 22.50, image: "img2.jpg", link: "https://shopping.google.com", rating: 4.1, reviews: 150 }] }),
  searchCJProducts: vi.fn().mockResolvedValue({ search_results: [] }),
}));

import { POST } from "./route";
import { searchAmazon, searchGoogleShopping, searchCJProducts } from "@/lib/platform-search";

function makeReq(body: any) {
  return { json: async () => body } as any;
}

describe("POST /api/products/similar", () => {
  beforeEach(() => {
    vi.mocked(searchAmazon).mockResolvedValue({ search_results: [{ title: "Similar Amazon Item", price: 19.99, image: "img.jpg", link: "https://amazon.com", rating: 4.3, reviews: 200 }] } as any);
    vi.mocked(searchGoogleShopping).mockResolvedValue({ search_results: [{ title: "Similar Google Item", price: 22.50, image: "img2.jpg", link: "https://shopping.google.com", rating: 4.1, reviews: 150 }] } as any);
    vi.mocked(searchCJProducts).mockResolvedValue({ search_results: [] } as any);
  });

  it("returns 400 when both title and category are missing", async () => {
    const res = await POST(makeReq({}), null as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Title or category");
  });

  it("finds similar products for a valid title", async () => {
    const res = await POST(makeReq({ title: "Wireless Earbuds", category: "Electronics", currentPrice: 29.99 }), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.similar).toBeDefined();
    expect(Array.isArray(data.similar)).toBe(true);
    expect(data.boughtTogether).toBeDefined();
  });

  it("calls search functions for both similar and bought-together", async () => {
    await POST(makeReq({ title: "Phone Case", category: "Accessories" }), null as any);
    expect(searchAmazon).toHaveBeenCalled();
    expect(searchGoogleShopping).toHaveBeenCalled();
  });

  it("returns empty arrays when no results found", async () => {
    vi.mocked(searchAmazon).mockResolvedValue({ search_results: [] } as any);
    vi.mocked(searchGoogleShopping).mockResolvedValue({ search_results: [] } as any);
    vi.mocked(searchCJProducts).mockResolvedValue({ search_results: [] } as any);
    const res = await POST(makeReq({ title: "Nonexistent Widget", category: "Misc" }), null as any);
    const data = await res.json();
    expect(data.similar).toEqual([]);
    expect(data.boughtTogether).toEqual([]);
  });
});
