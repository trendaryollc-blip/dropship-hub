import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalCJKey = process.env.CJ_API_KEY;

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/cj-auth", () => ({
  getCJAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

vi.mock("@/lib/feed-cache", () => ({
  getFeedCache: vi.fn().mockResolvedValue(null),
  setFeedCache: vi.fn().mockResolvedValue(undefined),
}));

describe("GET /api/niches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalCJKey === undefined) delete process.env.CJ_API_KEY;
    else process.env.CJ_API_KEY = originalCJKey;
  });

  it("returns empty niches with setup guidance when CJ_API_KEY is not set", async () => {
    delete process.env.CJ_API_KEY;

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/niches");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.niches).toEqual([]);
    expect(json.isFallback).toBe(true);
    expect(json.reason).toMatch(/CJ API key/i);
    expect(json.setup?.whereToSet).toBe("CJ_API_KEY");

    process.env.CJ_API_KEY = originalCJKey;
  });

  it("does not invent growth % or synthetic companion stats", async () => {
    process.env.CJ_API_KEY = "test-key";

    const categoryData = {
      data: [
        {
          categoryFirstName: "Electronics",
          categoryFirstList: [{ categorySecondName: "Phones" }],
        },
      ],
    };

    const productData = {
      code: 200,
      data: {
        list: [
          {
            pid: "p1",
            productNameEn: "Phone Case Pro",
            sellPrice: 20,
            productPrice: 10,
            productImage: "https://cdn.example.com/case.jpg",
            productImageSet: [],
          },
        ],
        total: 1,
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/product/getCategory")) {
          return new Response(JSON.stringify(categoryData), { status: 200 });
        }
        if (url.includes("/product/list")) {
          return new Response(JSON.stringify(productData), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/niches");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.isFallback).toBe(false);
    expect(json.niches.length).toBeGreaterThan(0);

    for (const niche of json.niches) {
      expect(niche.growth).toBeNull();
      expect(niche.avgShippingDays).toBeNull();
      expect(niche.avgReturnRate).toBeNull();
      expect(niche.estimatedMonthlyRevenue).toBeNull();
      expect(niche.geographicDemand).toEqual([]);
      expect(niche.seasonalTrend).toEqual([]);
      expect(niche.weeklyData).toEqual([]);
      expect(niche.topSuppliers).toEqual([]);
      if (niche.competition) {
        expect(niche.competition.storeCount).toBeNull();
        expect(niche.competition.avgStoreRating).toBeNull();
      }
      if (Array.isArray(niche.topProducts)) {
        for (const p of niche.topProducts) {
          expect(p.orders).toBeNull();
          expect(p.rating).toBeNull();
        }
      }
    }
  });

  it("computes avgMargin only from real CJ prices", async () => {
    process.env.CJ_API_KEY = "test-key";

    const categoryData = {
      data: [
        {
          categoryFirstName: "Home",
          categoryFirstList: [{ categorySecondName: "Kitchen" }],
        },
      ],
    };

    const productData = {
      code: 200,
      data: {
        list: [
          {
            pid: "p1",
            productNameEn: "Whisk",
            sellPrice: 20,
            productPrice: 10,
            productImage: "https://cdn.example.com/whisk.jpg",
          },
        ],
        total: 1,
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/product/getCategory")) {
          return new Response(JSON.stringify(categoryData), { status: 200 });
        }
        if (url.includes("/product/list")) {
          return new Response(JSON.stringify(productData), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/niches") as any);
    const json = await res.json();
    const niche = json.niches[0];

    expect(niche.productCount).toBe(1);
    expect(niche.avgMargin).toBe(50);
    expect(niche.avgSellingPrice).toBe(20);
    expect(niche.competition.priceRange).toEqual({ min: 12, max: 36, avg: 20 });
    expect(niche.scores.demand).toBe(5);
    expect(niche.heat).toBeLessThanOrEqual(99);
    expect(niche).toHaveProperty("id");
    expect(niche).toHaveProperty("name");
    expect(niche).toHaveProperty("overallScore");
    expect(niche).toHaveProperty("grade");
  });

  it("assigns unique images even when CJ returns identical products for every search", async () => {
    process.env.CJ_API_KEY = "test-key";

    const categoryData = {
      data: Array.from({ length: 8 }, (_, i) => ({
        categoryFirstName: `Parent ${i}`,
        categoryFirstList: [{ categorySecondName: `Category ${i} Zone` }],
      })),
    };

    const productData = {
      code: 200,
      data: {
        list: [
          {
            pid: "p1",
            productNameEn: "Same Top Product",
            sellPrice: 20,
            productPrice: 10,
            productImage: "https://cdn.example.com/same.jpg",
            productImageSet: [],
          },
          {
            pid: "p2",
            productNameEn: "Second Product",
            sellPrice: 30,
            productPrice: 15,
            productImage: "https://cdn.example.com/second.jpg",
            productImageSet: [],
          },
        ],
        total: 2,
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/product/getCategory")) {
          return new Response(JSON.stringify(categoryData), { status: 200 });
        }
        if (url.includes("/product/list")) {
          return new Response(JSON.stringify(productData), { status: 200 });
        }
        return new Response(JSON.stringify({}), { status: 404 });
      }),
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/niches");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.niches).toHaveLength(8);
    const images = json.niches.map((n: any) => n.image);
    images.forEach((img: any) => expect(typeof img).toBe("string"));
    expect(new Set(images).size).toBe(8);
  });
});
