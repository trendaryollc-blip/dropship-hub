import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Temu API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SCRAPER_API_KEY = "test-scraper-key";
    delete process.env.ZENROWS_API_KEY;
  });

  it("GET returns platform info", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/temu" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("Temu");
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
      text: async () => '<div title="Temu Cheap Gadget"><img src="https://example.com/temu.jpg"></div><span>$5.99</span>',
    });
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "cheap gadget" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.source).toBe("temu");
    expect(body.data.search_results).toBeDefined();
  });
});
