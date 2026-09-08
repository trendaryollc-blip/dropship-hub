import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Rainforest API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RAINFOREST_API_KEY = "test-rf-key";
  });

  it("GET returns platform info", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/rainforest" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("Rainforest API (Amazon)");
    expect(body.configured).toBe(true);
  });

  it("POST returns 503 when API key is missing", async () => {
    delete process.env.RAINFOREST_API_KEY;
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

  it("POST fetches product details by ASIN", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ product: { title: "Amazon Test", price: 49.99 } }),
    });
    const { POST } = await import("./route");
    const req = { json: async () => ({ action: "product", asin: "B0TEST123" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.source).toBe("rainforest");
    expect(body.action).toBe("product");
  });
});
