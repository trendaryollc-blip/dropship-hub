import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/platform-search", () => ({
  searchKeepaProducts: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Keepa API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.KEEPA_API_KEY = "test-keepa-key";
  });

  it("GET returns platform info", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/keepa" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("Keepa");
    expect(body.configured).toBe(true);
  });

  it("POST returns 503 when KEEPA_API_KEY is missing", async () => {
    delete process.env.KEEPA_API_KEY;
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("POST returns 400 when query is missing and no asin", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({}) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("Query is required");
  });

  it("POST fetches product by ASIN when asin provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        products: [{
          asin: "B08N5WRWNW",
          title: "Keepa Test Product",
          brand: "TestBrand",
          stats: { current: [1999], avg90: [2499], currentRank: [100] },
          rating: 4.5,
          reviewCount: 1234,
        }],
      }),
    });
    const { POST } = await import("./route");
    const req = { json: async () => ({ asin: "B08N5WRWNW" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.source).toBe("keepa");
    expect(body.data.asin).toBe("B08N5WRWNW");
    expect(body.data.price).toBe(19.99);
  });
});
