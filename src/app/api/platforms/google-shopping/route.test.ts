import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/platform-search", () => ({
  searchGoogleShopping: vi.fn(),
}));

describe("Google Shopping API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SERP_API_KEY = "test-serp-key";
  });

  it("GET returns platform info", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/google-shopping" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("Google Shopping");
    expect(body.configured).toBe(true);
  });

  it("POST returns 503 when SERP_API_KEY is missing", async () => {
    delete process.env.SERP_API_KEY;
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

  it("POST calls searchGoogleShopping and returns data", async () => {
    const { searchGoogleShopping } = await import("@/lib/platform-search");
    vi.mocked(searchGoogleShopping).mockResolvedValue({ search_results: [{ title: "Test Product", price: 50, image: null, link: "", source: "google_shopping" }] });
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "phone" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.source).toBe("google_shopping");
    expect(body.data.search_results).toHaveLength(1);
    expect(searchGoogleShopping).toHaveBeenCalledWith("phone");
  });
});
