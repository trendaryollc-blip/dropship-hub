import { beforeEach, describe, expect, it, vi } from "vitest";

const mockWithKeyPool = vi.fn();
vi.mock("@/lib/api-keys/pool", () => ({
  withKeyPool: (...args: unknown[]) => mockWithKeyPool(...args),
  ConfigMissingError: class ConfigMissingError extends Error {},
}));
vi.mock("@/lib/auth", () => ({
  withAuth: (handler: (request: unknown) => Promise<Response>) => handler,
}));
vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { PRODUCT_ENRICH: { windowMs: 60_000, maxRequests: 20 } },
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return { json: async () => body } as never;
}

describe("POST /api/products/match-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithKeyPool.mockImplementation((_provider: string, fn: (key: string) => Promise<unknown>) => fn("test-serpapi-key"));
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (input: string) => ({
      ok: true,
      json: async () => input.includes("type=products") ? ({
        product_results: [
          { title: "Similar item on Walmart", link: "https://www.walmart.com/ip/456", extracted_price: 21.5, currency: "USD" },
          { title: "Unrelated replacement blender", link: "https://www.aliexpress.com/item/999", extracted_price: 99, currency: "USD" },
        ],
      }) : ({
        exact_matches: [
          { title: "Same item on eBay", link: "https://www.ebay.com/itm/123", thumbnail: "https://img.example.com/ebay.jpg", price: "$18.00" },
          { title: "Same source listing", link: "https://www.amazon.com/dp/ASIN123456", thumbnail: "https://img.example.com/source.jpg" },
        ],
        visual_matches: [
          { title: "Similar item on Walmart", link: "https://www.walmart.com/ip/456", thumbnail: "https://img.example.com/walmart.jpg" },
          { title: "Structured price on Etsy", link: "https://www.etsy.com/listing/789", price: { value: 16.25, currency: "USD" } },
          { title: "String raw price on Alibaba", link: "https://www.alibaba.com/product/999", price: { raw: "13.40", currency: "USD" } },
          { title: "Jadeite necklace on AliExpress", link: "https://www.aliexpress.com/item/123", thumbnail: "https://img.example.com/jade.jpg" },
          { title: "Unrelated page", link: "https://example.org/page" },
          { title: "Duplicate eBay result", link: "https://www.ebay.com/itm/123?ref=lens" },
        ],
      }),
    })));
  });

  it("rejects missing or non-public image URLs", async () => {
    const missing = await POST(makeRequest({ source: "amazon" }));
    expect(missing.status).toBe(400);

    const local = await POST(makeRequest({ imageUrl: "http://127.0.0.1/private.jpg" }));
    expect(local.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns exact and visual marketplace matches while excluding the source platform", async () => {
    const response = await POST(makeRequest({
      imageUrl: "https://images.example.com/product.jpg",
      source: "amazon",
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.matches).toHaveLength(5);
    expect(data.matches.map((match: { platform: string; matchType: string }) => [match.platform, match.matchType])).toEqual([
      ["ebay", "exact"],
      ["walmart", "visual"],
      ["etsy", "visual"],
      ["alibaba", "visual"],
      ["aliexpress", "visual"],
    ]);
    expect(data.matches[0].price).toBe("$18.00");
    expect(data.matches[1].price).toBe("$21.50");
    expect(data.matches[2].price).toBe("$16.25");
    expect(data.matches[3].price).toBe("13.40 USD");
    expect(data.matches[4].price).toBeNull();
    expect(data.exactCount).toBe(1);
    expect(data.visualCount).toBe(4);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("engine=google_lens"), expect.anything());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("country=us"), expect.anything());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("hl=en"), expect.anything());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("type=products"), expect.anything());
  });

  it("keeps non-USD currencies explicit when Lens returns localized price strings", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        visual_matches: [{
          title: "Leather belt listing",
          link: "https://www.dhgate.com/product/belt/123.html",
          price: "₹1,637",
        }],
      }),
    }));

    const response = await POST(makeRequest({
      imageUrl: "https://images.example.com/belt.jpg",
      source: "cj",
    }));
    const data = await response.json();

    expect(data.matches[0].price).toBe("₹1,637");
  });

  it("returns a configuration error when the SerpAPI key is missing", async () => {
    const { ConfigMissingError } = await import("@/lib/api-keys/pool");
    mockWithKeyPool.mockRejectedValue(new ConfigMissingError("missing key"));
    const response = await POST(makeRequest({ imageUrl: "https://images.example.com/product.jpg" }));
    expect(response.status).toBe(503);
  });
});