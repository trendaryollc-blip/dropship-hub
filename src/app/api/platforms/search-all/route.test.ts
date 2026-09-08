import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSearchAllPlatforms = vi.fn();
const mockGetAllPlatforms = vi.fn();

vi.mock("@/lib/platform-search", () => ({
  searchAllPlatforms: (...args: unknown[]) => mockSearchAllPlatforms(...args),
  platforms: [
    { id: "amazon", name: "Amazon", envKey: "RAINFOREST_API_KEY" },
    { id: "ebay", name: "eBay", envKey: "SCRAPER_API_KEY" },
    { id: "aliexpress", name: "AliExpress", envKey: "SCRAPER_API_KEY" },
  ],
}));

vi.mock("@/lib/platform-config", () => ({
  getAllPlatforms: (...args: unknown[]) => mockGetAllPlatforms(...args),
}));

vi.mock("@/lib/auth", () => ({
  withAuth: (handler: (req: any, uid: string) => Promise<any>) => {
    return async (request: any) => {
      return handler(request, "test-user-uid");
    };
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: {
    PLATFORM_SEARCH: { windowMs: 60000, maxRequests: 100 },
    DEFAULT: { windowMs: 60000, maxRequests: 100 },
  },
}));

vi.mock("@/lib/logger", () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function makePostRequest(body: unknown) {
  return {
    url: "http://localhost/api/platforms/search-all",
    method: "POST",
    json: async () => body,
    signal: AbortSignal.timeout(30000),
  } as any;
}

function makeGetRequest(url: string) {
  return {
    url,
    method: "GET",
  } as any;
}

describe("/api/platforms/search-all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("POST", () => {
    it("returns 400 when query is missing", async () => {
      const { POST } = await import("./route");
      const req = makePostRequest({});
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe("Query is required");
    });

    it("searches all platforms and returns enriched results", async () => {
      mockSearchAllPlatforms.mockResolvedValue([
        {
          platform: "amazon",
          name: "Amazon",
          data: {
            search_results: [
              { title: "Wireless Earbuds", price: 29.99, image: null, link: "https://amazon.com/1", source: "amazon" },
            ],
          },
        },
        {
          platform: "ebay",
          name: "eBay",
          data: {
            search_results: [
              { title: "Wireless Earbuds Pro", price: 24.99, image: null, link: "https://ebay.com/1", source: "ebay" },
            ],
          },
        },
      ]);

      const { POST } = await import("./route");
      const req = makePostRequest({ query: "wireless earbuds" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.query).toBe("wireless earbuds");
      expect(data.mergedProducts).toBeDefined();
      expect(Array.isArray(data.mergedProducts)).toBe(true);
      expect(data.platforms).toBeDefined();
    });

    it("applies intent parsing to results", async () => {
      mockSearchAllPlatforms.mockResolvedValue([
        {
          platform: "amazon",
          name: "Amazon",
          data: {
            search_results: [
              { title: "Wireless Earbuds", price: 15.00, image: null, link: "https://amazon.com/1", source: "amazon" },
            ],
          },
        },
      ]);

      const { POST } = await import("./route");
      const req = makePostRequest({ query: "cheap wireless earbuds under $20" });
      const res = await POST(req);
      const data = await res.json();

      expect(data.intent).toBeDefined();
      expect(data.intent.priceMax).toBe(20);
      expect(data.filters).toBeDefined();
    });

    it("handles platform errors gracefully", async () => {
      mockSearchAllPlatforms.mockResolvedValue([
        {
          platform: "amazon",
          name: "Amazon",
          data: null,
          error: "API key invalid",
        },
      ]);

      const { POST } = await import("./route");
      const req = makePostRequest({ query: "test" });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.platformErrors).toBeDefined();
      expect(data.platformErrors.length).toBeGreaterThan(0);
    });

    it("filters by selected platforms", async () => {
      mockSearchAllPlatforms.mockResolvedValue([
        {
          platform: "amazon",
          name: "Amazon",
          data: {
            search_results: [
              { title: "Product A", price: 10, image: null, link: "https://amazon.com/1", source: "amazon" },
            ],
          },
        },
      ]);

      const { POST } = await import("./route");
      const req = makePostRequest({ query: "test", platforms: ["amazon"] });
      const res = await POST(req);
      const data = await res.json();

      expect(mockSearchAllPlatforms).toHaveBeenCalledWith("test", ["amazon"]);
      expect(data.mergedProducts).toBeDefined();
    });

    it("enriches products with golden score and margin", async () => {
      mockSearchAllPlatforms.mockResolvedValue([
        {
          platform: "amazon",
          name: "Amazon",
          data: {
            search_results: [
              {
                title: "Premium Wireless Earbuds",
                price: 49.99,
                image: null,
                link: "https://amazon.com/1",
                source: "amazon",
                brand: "TechBrand",
                rating: 4.5,
                reviews: 1200,
              },
            ],
          },
        },
      ]);

      const { POST } = await import("./route");
      const req = makePostRequest({ query: "premium earbuds" });
      const res = await POST(req);
      const data = await res.json();

      expect(data.mergedProducts.length).toBeGreaterThan(0);
      const product = data.mergedProducts[0];
      expect(product.goldenScore).toBeDefined();
      expect(product.goldenRank).toBeDefined();
      expect(product.estimatedMargin).toBeDefined();
    });

    it("returns streaming response when stream=true", async () => {
      mockGetAllPlatforms.mockResolvedValue([]);
      mockSearchAllPlatforms.mockResolvedValue([]);

      const { POST } = await import("./route");
      const req = makePostRequest({ query: "test", stream: true });
      const res = await POST(req);

      expect(res.headers.get("Content-Type")).toBe("text/event-stream");
      expect(res.headers.get("Cache-Control")).toBe("no-cache");
      expect(res.headers.get("Connection")).toBe("keep-alive");
    });
  });

  describe("GET", () => {
    it("returns platforms from Firestore", async () => {
      mockGetAllPlatforms.mockResolvedValue([
        { id: "amazon", name: "Amazon", method: "api", enabled: true, keys: ["key1"], lastHealth: "healthy" },
      ]);

      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/platforms/search-all");
      const res = await GET(req);
      const data = await res.json();

      expect(data.platforms).toBeDefined();
      expect(data.platforms.length).toBe(1);
      expect(data.platforms[0].id).toBe("amazon");
      expect(data.source).toBe("firestore");
    });

    it("falls back to env-based platforms when Firestore fails", async () => {
      mockGetAllPlatforms.mockRejectedValue(new Error("Firestore unavailable"));

      const { GET } = await import("./route");
      const req = makeGetRequest("http://localhost/api/platforms/search-all");
      const res = await GET(req);
      const data = await res.json();

      expect(data.platforms).toBeDefined();
      expect(data.platforms.length).toBeGreaterThan(0);
      expect(data.source).toBe("env");
    });
  });
});
