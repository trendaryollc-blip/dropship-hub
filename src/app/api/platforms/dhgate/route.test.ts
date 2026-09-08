import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("DHgate API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SCRAPER_API_KEY = "test-scraper-key";
    delete process.env.ZENROWS_API_KEY;
  });

  it("GET returns platform info", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/dhgate" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("DHgate");
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

  it("POST returns 503 when no scraper key configured", async () => {
    delete process.env.SCRAPER_API_KEY;
    delete process.env.ZENROWS_API_KEY;
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("POST returns products on successful scrape", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '<div title="DHgate Product Widget"><img src="https://example.com/dh.jpg"></div><span>$15.50</span>',
    });
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "wholesale item" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.source).toBe("dhgate");
    expect(body.data.search_results).toBeDefined();
  });
});
