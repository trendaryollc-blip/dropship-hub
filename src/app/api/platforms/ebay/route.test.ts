import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("eBay API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.EBAY_APP_ID = "test-ebay-key";
  });

  it("GET returns platform info", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/ebay" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("eBay");
    expect(body.configured).toBe(true);
  });

  it("POST returns 503 when EBAY_APP_ID is placeholder", async () => {
    process.env.EBAY_APP_ID = "YourAppId";
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("POST returns 400 when query is missing", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({}) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("Query is required");
  });

  it("POST fetches eBay results successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        itemSummaries: [
          { title: "Cool Widget", price: { value: "29.99" }, image: { imageUrl: "https://img.com/w.jpg" }, itemWebUrl: "https://ebay.com/itm/123" },
        ],
      }),
    });
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "widget" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.source).toBe("ebay");
    expect(body.data.search_results).toHaveLength(1);
    expect(body.data.search_results[0].title).toBe("Cool Widget");
  });
});
