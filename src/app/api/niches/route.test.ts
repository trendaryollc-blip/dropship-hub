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

  it("returns fallback niches when CJ_API_KEY is not set", async () => {
    const original = process.env.CJ_API_KEY;
    delete process.env.CJ_API_KEY;

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/niches");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.niches).toBeDefined();
    expect(json.niches.length).toBeGreaterThan(0);
    expect(json.isFallback).toBe(true);

    process.env.CJ_API_KEY = original;
  });

  it("returns niches with required fields", async () => {
    const original = process.env.CJ_API_KEY;
    delete process.env.CJ_API_KEY;

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/niches");
    const res = await GET(req as any);
    const json = await res.json();

    const niche = json.niches[0];
    expect(niche).toHaveProperty("id");
    expect(niche).toHaveProperty("name");
    expect(niche).toHaveProperty("overallScore");
    expect(niche).toHaveProperty("grade");

    process.env.CJ_API_KEY = original;
  });

  it("fallback niches have valid grades", async () => {
    const original = process.env.CJ_API_KEY;
    delete process.env.CJ_API_KEY;

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/niches");
    const res = await GET(req as any);
    const json = await res.json();

    const validGrades = ["A+", "A", "B+", "B", "C+", "C"];
    json.niches.forEach((n: any) => {
      expect(validGrades).toContain(n.grade);
    });

    process.env.CJ_API_KEY = original;
  });

  it("fallback niches all have unique images", async () => {
    delete process.env.CJ_API_KEY;

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/niches");
    const res = await GET(req as any);
    const json = await res.json();

    const images = json.niches.map((n: any) => n.image);
    expect(images.length).toBeGreaterThan(1);
    expect(new Set(images).size).toBe(images.length);
  });

  it("assigns unique images even when CJ returns identical products for every search", async () => {
    process.env.CJ_API_KEY = "test-key";

    const categoryData = {
      data: Array.from({ length: 8 }, (_, i) => ({
        categoryFirstName: `Parent ${i}`,
        categoryFirstList: [{ categorySecondName: `Category ${i} Zone` }],
      })),
    };

    // Same top products for every search — the bug scenario that caused all
    // niche cards to render the identical image
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
