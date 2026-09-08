import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("PriceCharting API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.PRICECHARTING_API_KEY = "test-pc-key";
  });

  it("GET returns platform info", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/pricecharting" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("PriceCharting");
    expect(body.configured).toBe(true);
  });

  it("POST returns 503 when API key is missing", async () => {
    delete process.env.PRICECHARTING_API_KEY;
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("POST returns 400 when query is missing and no productId", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({}) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("Query is required");
  });

  it("POST fetches product by productId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 123, name: "Super Mario Bros", loosePrice: 29.99 }),
    });
    const { POST } = await import("./route");
    const req = { json: async () => ({ productId: "123" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.source).toBe("pricecharting");
    expect(body.data.name).toBe("Super Mario Bros");
  });
});
