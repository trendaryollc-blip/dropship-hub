import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/platform-search", () => ({
  searchCJProducts: vi.fn(),
}));

vi.mock("@/lib/cj-auth", () => ({
  getCJAccessToken: vi.fn(),
}));

describe("CJ API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.CJ_API_KEY = "test-cj-key";
  });

  it("GET returns platform info", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/cj" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("CJ Dropshipping");
    expect(body.configured).toBe(true);
  });

  it("POST returns 503 when CJ_API_KEY is missing", async () => {
    delete process.env.CJ_API_KEY;
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("POST returns 503 when CJ auth fails", async () => {
    const { getCJAccessToken } = await import("@/lib/cj-auth");
    vi.mocked(getCJAccessToken).mockResolvedValue("");
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("POST searches CJ products when query provided", async () => {
    const { getCJAccessToken } = await import("@/lib/cj-auth");
    const { searchCJProducts } = await import("@/lib/platform-search");
    vi.mocked(getCJAccessToken).mockResolvedValue("token-123");
    vi.mocked(searchCJProducts).mockResolvedValue({ search_results: [] });
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "phone case" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.source).toBe("cj");
    expect(searchCJProducts).toHaveBeenCalledWith("phone case");
  });
});
