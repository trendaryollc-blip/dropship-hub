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
  searchAmazon: vi.fn(),
  searchGoogleShopping: vi.fn(),
  searchCJProducts: vi.fn(),
}));

import { POST } from "./route";
import { searchAmazon, searchGoogleShopping, searchCJProducts } from "@/lib/platform-search";

function makeReq(body: any) {
  return { json: async () => body } as any;
}

// Returns search results only for queries containing the given keyword,
// so tests can simulate a marketplace that echoes query terms in titles.
function mockSearches(matches: { keyword: string; titles: string[] }) {
  const impl = async (query: string) => ({
    search_results: query.toLowerCase().includes(matches.keyword.toLowerCase())
      ? matches.titles.map((title, i) => ({
          title,
          price: 19.99 + i,
          image: `img-${i}.jpg`,
          link: `https://example.com/${i}`,
          rating: 4.3,
          reviews: 200,
        }))
      : [],
  });
  vi.mocked(searchAmazon).mockImplementation(impl as any);
  vi.mocked(searchGoogleShopping).mockImplementation(impl as any);
  vi.mocked(searchCJProducts).mockImplementation(async () => ({ search_results: [] }) as any);
}

describe("POST /api/products/similar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when both title and category are missing", async () => {
    const res = await POST(makeReq({}), null as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Title or category");
  });

  it("finds similar products for a valid title", async () => {
    mockSearches({
      keyword: "wireless earbuds",
      titles: ["Wireless Earbuds Bluetooth 5.3 Noise Cancelling Headphones"],
    });
    const res = await POST(makeReq({ title: "Wireless Earbuds", category: "Electronics", currentPrice: 29.99 }), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.similar).toBeDefined();
    expect(Array.isArray(data.similar)).toBe(true);
    expect(data.similar.length).toBeGreaterThan(0);
    expect(data.boughtTogether).toBeDefined();
  });

  it("calls search functions for both similar and bought-together", async () => {
    mockSearches({ keyword: "phone case", titles: [] });
    await POST(makeReq({ title: "Phone Case", category: "Accessories" }), null as any);
    expect(searchAmazon).toHaveBeenCalled();
    expect(searchGoogleShopping).toHaveBeenCalled();
  });

  it("returns empty arrays when no results found", async () => {
    mockSearches({ keyword: "___no_match___", titles: [] });
    const res = await POST(makeReq({ title: "Nonexistent Widget", category: "Misc" }), null as any);
    const data = await res.json();
    expect(data.similar).toEqual([]);
    expect(data.boughtTogether).toEqual([]);
  });

  it("filters out results unrelated to the source product", async () => {
    mockSearches({
      keyword: "wireless earbuds",
      titles: [
        "Wireless Earbuds Bluetooth Noise Cancelling with Charging Case",
        "Stainless Steel Kitchen Knife Set 8 Piece",
        "Stainless Steel Kitchen Knife Set Professional Chef Blades",
      ],
    });
    const res = await POST(makeReq({ title: "Wireless Earbuds Bluetooth Noise Cancelling" }), null as any);
    const data = await res.json();
    expect(data.similar).toHaveLength(1);
    expect(data.similar[0].title).toContain("Wireless Earbuds");
  });

  it("never searches with a generic category alone", async () => {
    const queries: string[] = [];
    const impl = async (query: string) => {
      queries.push(query);
      return { search_results: [] };
    };
    vi.mocked(searchAmazon).mockImplementation(impl as any);
    vi.mocked(searchGoogleShopping).mockImplementation(impl as any);
    vi.mocked(searchCJProducts).mockImplementation(impl as any);

    await POST(makeReq({ title: "Wireless Earbuds", category: "General" }), null as any);

    expect(queries.length).toBeGreaterThan(0);
    expect(queries).not.toContain("General");
    expect(queries.some((q) => q.toLowerCase().includes("wireless earbuds"))).toBe(true);
  });

  it("builds bought-together queries from the product title, not the category", async () => {
    const queries: string[] = [];
    const impl = async (query: string) => {
      queries.push(query);
      return { search_results: [] };
    };
    vi.mocked(searchAmazon).mockImplementation(impl as any);
    vi.mocked(searchGoogleShopping).mockImplementation(impl as any);
    vi.mocked(searchCJProducts).mockImplementation(impl as any);

    await POST(makeReq({ title: "Wireless Earbuds", category: "Electronics" }), null as any);

    expect(queries.some((q) => q.toLowerCase().includes("wireless earbuds accessories"))).toBe(true);
    expect(queries).not.toContain("Electronics accessories");
  });
});
