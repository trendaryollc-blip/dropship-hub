import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

// The URL-safety layer resolves allowlisted hostnames to guard against DNS
// rebinding. Mock it so tests never touch the real network.
const dnsLookupMock = vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
const mockGetCJAccessToken = vi.hoisted(() => vi.fn());
const mockWithKeyPool = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({
  default: { lookup: dnsLookupMock },
  lookup: dnsLookupMock,
}));
vi.mock("@/lib/cj-auth", () => ({
  getCJAccessToken: (...args: unknown[]) => mockGetCJAccessToken(...args),
}));
vi.mock("@/lib/api-keys/pool", () => ({
  withKeyPool: (...args: unknown[]) => mockWithKeyPool(...args),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Product Images API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAINFOREST_API_KEY = "test-rf-key";
    process.env.SCRAPER_API_KEY = "test-scraper-key";
    mockGetCJAccessToken.mockResolvedValue("test-cj-token");
    mockWithKeyPool.mockImplementation((_provider: string, fn: (key: string) => Promise<unknown>) => fn("test-serpapi-key"));
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

  it("fetches the complete CJ image set through the native product detail API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          productImage: "https://cdn.cj.example/main.jpg",
          productImageSet: [
            { url: "https://cdn.cj.example/main.jpg" },
            { url: "https://cdn.cj.example/side.jpg" },
            { productImage: "https://cdn.cj.example/back.jpg" },
          ],
        },
      }),
    });
    const { POST } = await import("./route");
    const res = await POST({ json: async () => ({
      url: "https://www.cjdropshipping.com/product/jade-p-2609250256581624900.html",
      source: "cj",
    }) } as any);
    const body = await res.json();

    expect(body.images).toEqual([
      "https://cdn.cj.example/main.jpg",
      "https://cdn.cj.example/side.jpg",
      "https://cdn.cj.example/back.jpg",
    ]);
    expect(mockGetCJAccessToken).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("pid=2609250256581624900"),
      expect.objectContaining({ headers: expect.objectContaining({ "CJ-Access-Token": "test-cj-token" }) })
    );
  });

  it("fetches the complete AliExpress image set through SerpAPI product details", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        product: {
          image: "https://ae.example/main.jpg",
          images: ["https://ae.example/main.jpg", "https://ae.example/side.jpg", "https://ae.example/back.jpg"],
        },
      }),
    });
    const { POST } = await import("./route");
    const res = await POST({ json: async () => ({
      url: "https://www.aliexpress.com/item/1005001234567890.html",
      source: "aliexpress",
    }) } as any);
    const body = await res.json();

    expect(body.images).toEqual([
      "https://ae.example/main.jpg",
      "https://ae.example/side.jpg",
      "https://ae.example/back.jpg",
    ]);
    expect(mockWithKeyPool).toHaveBeenCalledWith("serpapi", expect.any(Function));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("product_id=1005001234567890"), expect.anything());
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
    const html = '<html><head><meta property="og:image" content="https://www.walmart.com/img/product-main.jpg"></head><body></body></html>';
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
    const req = { json: async () => ({ url: "https://www.walmart.com/ip/123", source: "walmart" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images).toBeDefined();
  });

  it("POST blocks SSRF attempts against private/cloud-metadata IPs", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({ url: "http://169.254.169.254/latest/meta-data/", source: "walmart" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images).toEqual([]);
    // The internal host must never be hit
    expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining("169.254.169.254"));
  });

  it("POST blocks SSRF via redirect to a private address", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 302,
      headers: { get: (k: string) => (k === "location" ? "http://169.254.169.254/latest/meta-data/" : null) },
    });
    const { POST } = await import("./route");
    const req = { json: async () => ({ url: "https://www.walmart.com/redirects", source: "walmart" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images).toEqual([]);
    const fetchUrls = mockFetch.mock.calls.map((c) => String(c[0]));
    expect(fetchUrls.every((u) => !u.includes("169.254.169.254"))).toBe(true);
  });

  it("POST blocks non-allowlisted hosts entirely", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({ url: "http://internal.corp.local/health", source: "walmart" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("POST blocks non-http(s) schemes", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({ url: "file:///etc/passwd", source: "walmart" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});