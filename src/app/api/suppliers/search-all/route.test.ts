import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSearchSupplierPlatforms = vi.fn();
const mockBuildSupplierProfiles = vi.fn();
const mockGetSupplierPlatformStatuses = vi.fn();

vi.mock("@/lib/supplier-platform-search", () => ({
  searchSupplierPlatforms: (...args: unknown[]) => mockSearchSupplierPlatforms(...args),
  buildSupplierProfiles: (...args: unknown[]) => mockBuildSupplierProfiles(...args),
  getSupplierPlatformStatuses: (...args: unknown[]) => mockGetSupplierPlatformStatuses(...args),
  DEFAULT_SEARCH_DEADLINE_MS: 45_000,
}));

const mockGetSuppliers = vi.fn();

vi.mock("@/lib/supplier-service", () => ({
  getSuppliers: (...args: unknown[]) => mockGetSuppliers(...args),
}));

const mockEnforceSearchDailyLimit = vi.fn();
vi.mock("@/lib/ai/tool-rate-limit", () => ({
  enforceSearchDailyLimit: (...args: unknown[]) => mockEnforceSearchDailyLimit(...args),
}));

vi.mock("@/lib/auth", () => ({
  withAuth: (handler: (req: unknown, uid: string) => Promise<Response>) => {
    return async (request: unknown) => handler(request, "test-user-uid");
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
    url: "http://localhost/api/suppliers/search-all",
    method: "POST",
    json: async () => body,
    signal: AbortSignal.timeout(30000),
  } as any;
}

function makeGetRequest() {
  return {
    url: "http://localhost/api/suppliers/search-all",
    method: "GET",
  } as any;
}

function makeSupplier(overrides: Record<string, unknown> = {}) {
  return {
    id: "cj-dropshipping",
    name: "CJ Dropshipping",
    slug: "cj-dropshipping",
    location: "Yiwu, China",
    country: "China",
    flag: "🇨🇳",
    description: "Dropshipping supplier",
    specializations: ["Electronics"],
    trustBadge: "gold",
    dataSource: "live",
    stats: {
      reliabilityScore: 0,
      rating: 0,
      reviews: 0,
      responseTime: "Check with supplier",
      responseTimeHours: 0,
      shippingDays: 0,
      shippingDaysEU: 0,
      orderCompletionRate: 0,
      disputeRate: 0,
      monthlyOrders: 0,
      totalProducts: 10,
      yearEstablished: 2014,
      communicationScore: 0,
      qualityScore: 0,
      priceCompetitiveness: 0,
    },
    shipping: {
      methods: [],
      processingTime: "1-3 days",
      freeShippingThreshold: null,
      packagingQuality: "standard",
    },
    quality: {
      inspection: "",
      returnPolicy: "",
      refundPolicy: "",
      replacementPolicy: "",
      disputeResolution: "",
      certifications: [],
    },
    catalog: {
      categories: ["Electronics"],
      priceRange: { min: 1, max: 20 },
      moq: 1,
      samplesAvailable: true,
      samplePrice: null,
    },
    communication: { methods: [], languages: [], supportHours: "" },
    source: "cj",
    sourceUrl: "https://cjdropshipping.com",
    lastUpdated: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("/api/suppliers/search-all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSuppliers.mockResolvedValue([makeSupplier()]);
    mockEnforceSearchDailyLimit.mockResolvedValue({ allowed: true });
  });

  describe("POST validation", () => {
    it("returns 400 when query is missing", async () => {
      const { POST } = await import("./route");
      const res = await POST(makePostRequest({}));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe("Query is required");
      expect(mockSearchSupplierPlatforms).not.toHaveBeenCalled();
    });

    it("returns 400 when query is too long", async () => {
      const { POST } = await import("./route");
      const res = await POST(makePostRequest({ query: "x".repeat(201) }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain("too long");
    });

    it("returns 400 when platforms is not an array", async () => {
      const { POST } = await import("./route");
      const res = await POST(makePostRequest({ query: "test", platforms: "alibaba" }));
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe("platforms must be an array");
    });

    it("returns 429 when the daily platform-search budget is exhausted", async () => {
      mockEnforceSearchDailyLimit.mockResolvedValue({
        allowed: false,
        error: "Daily platform-search limit reached: 20 searches per day on the free tier.",
      });

      const { POST } = await import("./route");
      const res = await POST(makePostRequest({ query: "toys" }));
      const data = await res.json();

      expect(res.status).toBe(429);
      expect(data.error).toContain("Daily platform-search limit reached");
      expect(mockSearchSupplierPlatforms).not.toHaveBeenCalled();
    });

    it("sanitizes and caps the selected platform list", async () => {
      mockSearchSupplierPlatforms.mockResolvedValue({ sources: [], errors: [], keywords: [] });
      mockBuildSupplierProfiles.mockReturnValue([]);

      const { POST } = await import("./route");
      const huge = Array.from({ length: 50 }, (_, i) => `platform_${i}`);
      const res = await POST(
        makePostRequest({
          query: "test",
          platforms: ["alibaba", "alibaba", "bad id!", "ALIBABA", "", "cj", ...huge],
        })
      );
      expect(res.status).toBe(200);

      const calledArgs = mockSearchSupplierPlatforms.mock.calls[0];
      expect(calledArgs[1].length).toBeLessThanOrEqual(20);
      expect(calledArgs[1]).toContain("alibaba");
      expect(calledArgs[1]).toContain("cj");
      expect(calledArgs[1]).not.toContain("bad id!");
      expect(calledArgs[1]).not.toContain("ALIBABA");
      expect(calledArgs[1]).not.toContain("");
    });
  });

  describe("POST results", () => {
    it("merges discovered suppliers with the local directory", async () => {
      const discovered = makeSupplier({
        id: "alibaba-factory-x-store",
        name: "Factory X Store",
        trustBadge: "unverified",
        dataSource: "estimated",
        source: "alibaba",
        specializations: ["baby", "toys"],
      });
      mockSearchSupplierPlatforms.mockResolvedValue({
        sources: [
          {
            platformId: "alibaba",
            platformName: "Alibaba",
            storeName: "Factory X Store",
            storeUrl: "https://www.alibaba.com/store/1.html",
            listingCount: 2,
            listings: [],
            dataSource: "estimated",
          },
        ],
        errors: [],
        keywords: ["baby", "toys"],
      });
      mockBuildSupplierProfiles.mockReturnValue([discovered]);

      const { POST } = await import("./route");
      const res = await POST(makePostRequest({ query: "baby toys" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.query).toBe("baby toys");
      expect(data.discoveredCount).toBe(1);
      expect(data.total).toBe(2);
      const ids = data.suppliers.map((s: { id: string }) => s.id);
      expect(ids).toContain("alibaba-factory-x-store");
      expect(ids).toContain("cj-dropshipping");
      expect(data.keywords).toEqual(["baby", "toys"]);
      expect(data.platformErrors).toEqual([]);
      expect(data.sources).toHaveLength(1);
      expect(data.sources[0]).toEqual({
        platform: "alibaba",
        store: "Factory X Store",
        listings: 2,
      });
    });

    it("ranks query-relevant discovered suppliers above unrelated local ones", async () => {
      const discovered = makeSupplier({
        id: "alibaba-factory-x-store",
        name: "Factory X Store",
        specializations: ["baby", "toys"],
      });
      mockSearchSupplierPlatforms.mockResolvedValue({ sources: [], errors: [], keywords: ["toys"] });
      mockBuildSupplierProfiles.mockReturnValue([discovered]);
      mockGetSuppliers.mockResolvedValue([
        makeSupplier({ specializations: ["Automotive Parts"] }),
      ]);

      const { POST } = await import("./route");
      const res = await POST(makePostRequest({ query: "toys" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.suppliers[0].id).toBe("alibaba-factory-x-store");
    });

    it("returns platform errors without failing the request", async () => {
      mockSearchSupplierPlatforms.mockResolvedValue({
        sources: [],
        errors: [{ platform: "alibaba", name: "Alibaba", error: "ScraperAPI is not configured. ..." }],
        keywords: ["toys"],
      });
      mockBuildSupplierProfiles.mockReturnValue([]);

      const { POST } = await import("./route");
      const res = await POST(makePostRequest({ query: "toys" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.platformErrors).toHaveLength(1);
      expect(data.platformErrors[0].platform).toBe("alibaba");
      expect(data.suppliers).toHaveLength(1);
    });

    it("still returns discovered suppliers when the local directory fails", async () => {
      const discovered = makeSupplier({ id: "dhgate-toys-store", name: "Toys Store" });
      mockSearchSupplierPlatforms.mockResolvedValue({ sources: [], errors: [], keywords: [] });
      mockBuildSupplierProfiles.mockReturnValue([discovered]);
      mockGetSuppliers.mockRejectedValue(new Error("firestore down"));

      const { POST } = await import("./route");
      const res = await POST(makePostRequest({ query: "toys" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.suppliers).toHaveLength(1);
      expect(data.suppliers[0].id).toBe("dhgate-toys-store");
    });

    it("sanitizes search input before it reaches the engine", async () => {
      mockSearchSupplierPlatforms.mockResolvedValue({ sources: [], errors: [], keywords: [] });
      mockBuildSupplierProfiles.mockReturnValue([]);

      const { POST } = await import("./route");
      const res = await POST(makePostRequest({ query: "  baby toys  " }));
      expect(res.status).toBe(200);
      expect(mockSearchSupplierPlatforms.mock.calls[0][0]).toBe("baby toys");
    });
  });

  describe("GET", () => {
    it("returns supplier platform configuration statuses", async () => {
      const statuses = [
        { id: "alibaba", name: "Alibaba", configured: true, method: "scraperapi", source: "env" },
        { id: "cj", name: "CJ Dropshipping", configured: false, method: "official_api", source: "env" },
      ];
      mockGetSupplierPlatformStatuses.mockResolvedValue(statuses);

      const { GET } = await import("./route");
      const res = await GET(makeGetRequest());
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.platforms).toEqual(statuses);
    });

    it("returns 500 with a safe message when statuses cannot load", async () => {
      mockGetSupplierPlatformStatuses.mockRejectedValue(new Error("secret internal detail"));

      const { GET } = await import("./route");
      const res = await GET(makeGetRequest());
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).not.toContain("secret internal detail");
    });
  });
});
