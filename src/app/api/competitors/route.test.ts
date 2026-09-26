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
  searchAmazon: vi.fn().mockResolvedValue({ search_results: [{ title: "Widget A", price: 25, seller: "Seller1", rating: 4.5, link: "https://amazon.com/1" }] }),
  searchGoogleShopping: vi.fn().mockResolvedValue({ search_results: [{ title: "Widget B", price: 30, seller: "Seller2", rating: 4.0, link: "https://google.com/1" }] }),
  searchCJProducts: vi.fn().mockResolvedValue({ search_results: [] }),
  searchKeepaProducts: vi.fn().mockResolvedValue({ search_results: [] }),
  searchAliExpress: vi.fn().mockResolvedValue({ search_results: [] }),
}));

describe("POST /api/competitors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when query is missing", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/competitors", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Missing required field");
  });

  it("returns market data when platforms return results", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/competitors", {
      method: "POST",
      body: JSON.stringify({ query: "wireless speaker" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.platforms).toBeDefined();
    expect(json.platforms.length).toBeGreaterThan(0);
    expect(json.avgPrice).toBeGreaterThan(0);
    // Listings without an age cannot support a time trend or a sparkline series
    for (const p of json.platforms) {
      expect(p.sparkline).toEqual([]);
      expect(p.trend).toBeNull();
    }
  });

  it("computes a real trend only when listings carry ages", async () => {
    const { searchAmazon } = await import("@/lib/platform-search");
    (searchAmazon as any).mockResolvedValue({
      search_results: [
        { title: "New 1", price: 40, seller: "S1", rating: 4.5, link: "https://amazon.com/1", daysAgo: 1 },
        { title: "New 2", price: 42, seller: "S2", rating: 4.4, link: "https://amazon.com/2", daysAgo: 2 },
        { title: "New 3", price: 39, seller: "S3", rating: 4.6, link: "https://amazon.com/3", daysAgo: 5 },
        { title: "New 4", price: 41, seller: "S4", rating: 4.2, link: "https://amazon.com/4", daysAgo: 7 },
        { title: "Old 1", price: 30, seller: "S5", rating: 4.1, link: "https://amazon.com/5", daysAgo: 30 },
        { title: "Old 2", price: 31, seller: "S6", rating: 4.0, link: "https://amazon.com/6", daysAgo: 45 },
        { title: "Old 3", price: 29, seller: "S7", rating: 4.3, link: "https://amazon.com/7", daysAgo: 60 },
        { title: "Old 4", price: 30, seller: "S8", rating: 4.7, link: "https://amazon.com/8", daysAgo: 90 },
      ],
    });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/competitors", {
      method: "POST",
      body: JSON.stringify({ query: "aged listings" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    const amazon = json.platforms.find((p: { platform: string }) => p.platform === "amazon");
    expect(amazon).toBeDefined();
    expect(amazon.trend).toBe("up");
    expect(amazon.trendPercent).toBeGreaterThan(20);
    expect(amazon.sparkline).toEqual([]);
  });

  it("returns 404 when no platforms return results", async () => {
    const { searchAmazon, searchGoogleShopping } = await import("@/lib/platform-search");
    (searchAmazon as any).mockResolvedValue({ search_results: [] });
    (searchGoogleShopping as any).mockResolvedValue({ search_results: [] });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/competitors", {
      method: "POST",
      body: JSON.stringify({ query: "xyznonexistent123" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(404);
  });
});
