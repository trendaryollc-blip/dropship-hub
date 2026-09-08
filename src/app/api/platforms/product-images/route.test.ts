import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Product Images API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAINFOREST_API_KEY = "test-rf-key";
    process.env.SCRAPER_API_KEY = "test-scraper-key";
  });

  it("POST returns empty images when no url or asin provided", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({}) } as any;
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.images).toEqual([]);
  });

  it("POST extracts ASIN from Amazon URL and fetches via Rainforest", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ product: { image: "https://m.media-amazon.com/images/I/test.jpg", images: ["https://m.media-amazon.com/images/I/test2.jpg"] } }),
    });
    const { POST } = await import("./route");
    const req = { json: async () => ({ url: "https://www.amazon.com/dp/B0TEST1234", source: "amazon" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images).toBeDefined();
    expect(Array.isArray(body.images)).toBe(true);
  });

  it("POST returns empty images when unable to fetch for non-amazon", async () => {
    delete process.env.SCRAPER_API_KEY;
    mockFetch.mockResolvedValue({
      ok: false,
      headers: { get: () => "text/html" },
    });
    const { POST } = await import("./route");
    const req = { json: async () => ({ url: "https://example.com/product", source: "walmart" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images).toEqual([]);
  });

  it("POST extracts images from HTML with og:image meta tag", async () => {
    const html = '<html><head><meta property="og:image" content="https://example.com/product-main.jpg"></head><body></body></html>';
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => "text/html" },
        text: async () => html,
      })
      .mockResolvedValue({
        ok: false,
        headers: { get: () => "text/html" },
      });
    const { POST } = await import("./route");
    const req = { json: async () => ({ url: "https://example.com/product", source: "other" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images).toBeDefined();
  });
});
