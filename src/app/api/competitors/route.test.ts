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
