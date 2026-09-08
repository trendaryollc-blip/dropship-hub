import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/platform-search", () => ({
  searchAliExpress: vi.fn(),
}));

describe("AliExpress API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SCRAPER_API_KEY = "test-scraper-key";
  });

  it("GET returns platform info", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/aliexpress" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("AliExpress");
    expect(body.configured).toBe(true);
  });

  it("POST returns 400 when query is missing", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({}) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("Query is required");
  });

  it("POST returns 503 when SCRAPER_API_KEY is missing", async () => {
    delete process.env.SCRAPER_API_KEY;
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("POST calls searchAliExpress and returns data", async () => {
    const { searchAliExpress } = await import("@/lib/platform-search");
    vi.mocked(searchAliExpress).mockResolvedValue({ search_results: [{ title: "Widget", price: 10, image: null, link: "", source: "aliexpress" }] });
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.source).toBe("aliexpress");
    expect(body.data.search_results).toHaveLength(1);
    expect(searchAliExpress).toHaveBeenCalledWith("test");
  });
});
