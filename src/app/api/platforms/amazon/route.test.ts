import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/platform-search", () => ({
  searchAmazon: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Amazon API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RAINFOREST_API_KEY = "test-rainforest-key";
  });

  it("GET returns platform info", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/amazon" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("Amazon");
    expect(body.configured).toBe(true);
  });

  it("POST returns 503 when RAINFOREST_API_KEY is missing", async () => {
    delete process.env.RAINFOREST_API_KEY;
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("POST returns 400 when neither query nor asin provided", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({}) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("Query is required");
  });

  it("POST calls searchAmazon when query is provided", async () => {
    const { searchAmazon } = await import("@/lib/platform-search");
    vi.mocked(searchAmazon).mockResolvedValue({ search_results: [] });
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "laptop" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.source).toBe("amazon");
    expect(searchAmazon).toHaveBeenCalledWith("laptop");
  });
});
