import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockWithAuth = vi.fn((handler: any) => async (req: any) => {
  return handler(req, "test-user-123");
});

function createMockNextRequest(url: string, init?: RequestInit & { method?: string }) {
  const parsed = new URL(url);
  return {
    nextUrl: parsed,
    url,
    method: init?.method ?? "GET",
    headers: new Headers(init?.headers as Record<string, string>),
    json: async () => JSON.parse((init?.body as string) ?? "{}"),
  };
}

describe("Trendaryo store proxy route", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  async function loadHandlers() {
    vi.doMock("next/server", () => ({
      NextRequest: createMockNextRequest,
      NextResponse: {
        json: (body: unknown, init?: { status?: number }) => ({
          status: init?.status ?? 200,
          json: () => Promise.resolve(body),
        }),
      },
    }));
    vi.doMock("@/lib/auth", () => ({
      withAuth: mockWithAuth,
    }));
    vi.doMock("@/lib/rate-limit", () => ({
      LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
      rateLimitByUser: vi.fn(() => ({ allowed: true })),
    }));
    const mod = await import("./route");
    return { GET: mod.GET, POST: mod.POST };
  }

  it("GET returns 400 for invalid action", async () => {
    const { GET } = await loadHandlers();
    const req = createMockNextRequest(
      "http://localhost/api/store/trendaryo?action=nonexistent",
    );
    const res = await GET(req as any);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid action");
  });

  it("GET proxies products action", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ products: [{ id: 1 }] }),
    });

    const { GET } = await loadHandlers();
    const req = createMockNextRequest(
      "http://localhost/api/store/trendaryo?action=products&limit=10&offset=0",
    );
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.products).toEqual([{ id: 1 }]);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://trendaryo-llc-backend.vercel.app/api/products?limit=10&offset=0",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("POST returns 400 for invalid action", async () => {
    const { POST } = await loadHandlers();
    const req = createMockNextRequest(
      "http://localhost/api/store/trendaryo",
      {
        method: "POST",
        body: JSON.stringify({ action: "nonexistent" }),
      },
    );
    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid action");
  });

  it("POST proxies createProduct action", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 201,
      json: async () => ({ id: 42, name: "Test Product" }),
    });

    const { POST } = await loadHandlers();
    const req = createMockNextRequest(
      "http://localhost/api/store/trendaryo",
      {
        method: "POST",
        body: JSON.stringify({ action: "createProduct", name: "Test Product", price: 9.99 }),
      },
    );
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual({ id: 42, name: "Test Product" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://trendaryo-llc-backend.vercel.app/api/products",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Test Product", price: 9.99 }),
      }),
    );
  });
});
