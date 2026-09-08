import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function createMockResponse(status: number, init?: { headers?: Record<string, string> }) {
  const headersMap = new Map<string, string>(Object.entries(init?.headers || {}));
  const cookieEntries: Array<{ name: string; value: string; delete?: boolean }> = [];
  return {
    status,
    headers: {
      get: (key: string) => {
        if (key === "set-cookie") {
          return cookieEntries
            .map((c) => `${c.name}=${c.delete ? "" : c.value}; Path=/; HttpOnly`)
            .join(", ");
        }
        return headersMap.get(key) || null;
      },
      set: (key: string, value: string) => headersMap.set(key, value),
    },
    cookies: {
      set: (name: string, value: string) => cookieEntries.push({ name, value }),
      delete: (name: string) => cookieEntries.push({ name, value: "", delete: true }),
      get: (name: string) => cookieEntries.find((c) => c.name === name && !c.delete)?.value,
    },
  };
}

vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((body, init) => ({
      status: init?.status || 200,
      json: () => Promise.resolve(body),
      headers: new Map(Object.entries(init?.headers || {})),
    })),
    redirect: vi.fn((url: string) => createMockResponse(307, { headers: { location: url } })),
  },
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv, SHOPIFY_API_KEY: "test_api_key" };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("/api/store/shopify/auth", () => {
  it("redirects to Shopify OAuth with correct params", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/store/shopify/auth?shop=test-store.myshopify.com&idToken=fake_token") as any;
    req.nextUrl = new URL("http://localhost/api/store/shopify/auth?shop=test-store.myshopify.com&idToken=fake_token");

    const response = await GET(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location") || "";
    expect(location).toContain("test-store.myshopify.com/admin/oauth/authorize");
    expect(location).toContain("client_id=test_api_key");
    expect(location).toContain("scope=");
    expect(location).toContain("state=");
  });

  it("returns 400 when shop parameter is missing", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/store/shopify/auth") as any;
    req.nextUrl = new URL("http://localhost/api/store/shopify/auth");

    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it("returns 503 when SHOPIFY_API_KEY is not set", async () => {
    delete process.env.SHOPIFY_API_KEY;
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/store/shopify/auth?shop=test.myshopify.com") as any;
    req.nextUrl = new URL("http://localhost/api/store/shopify/auth?shop=test.myshopify.com");

    const response = await GET(req);
    expect(response.status).toBe(503);
  });

  it("normalizes shop domain by removing protocol", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/store/shopify/auth?shop=https://test-store.myshopify.com/") as any;
    req.nextUrl = new URL("http://localhost/api/store/shopify/auth?shop=https://test-store.myshopify.com/");

    const response = await GET(req);
    expect(response.status).toBe(307);
  });

  it("sets oauth state cookie", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/store/shopify/auth?shop=test.myshopify.com") as any;
    req.nextUrl = new URL("http://localhost/api/store/shopify/auth?shop=test.myshopify.com");

    const response = await GET(req);
    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("shopify_oauth_state");
    expect(setCookie).toContain("shopify_shop");
  });

  it("sets id token cookie when provided", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/store/shopify/auth?shop=test.myshopify.com&idToken=my_id_token") as any;
    req.nextUrl = new URL("http://localhost/api/store/shopify/auth?shop=test.myshopify.com&idToken=my_id_token");

    const response = await GET(req);
    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("shopify_id_token");
  });

  it("does not set id token cookie when not provided", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/store/shopify/auth?shop=test.myshopify.com") as any;
    req.nextUrl = new URL("http://localhost/api/store/shopify/auth?shop=test.myshopify.com");

    const response = await GET(req);
    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).not.toContain("shopify_id_token");
  });
});
