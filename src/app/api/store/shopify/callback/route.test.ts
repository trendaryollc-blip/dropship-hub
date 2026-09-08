import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

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

const mockVerifyIdToken = vi.fn();
const mockGetAdminDB = vi.fn();
const mockRegisterShopifyWebhooks = vi.fn().mockResolvedValue({ registered: [], failed: [] });

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: mockGetAdminDB,
  getAdminAuth: vi.fn().mockReturnValue({
    verifyIdToken: mockVerifyIdToken,
  }),
}));

vi.mock("@/lib/shopify/webhooks", () => ({
  registerShopifyWebhooks: mockRegisterShopifyWebhooks,
}));

const originalEnv = { ...process.env };

function generateCallbackHmac(params: Record<string, string>, secret: string): string {
  const sorted = new URLSearchParams(params);
  sorted.delete("hmac");
  sorted.sort();
  return crypto.createHmac("sha256", secret).update(sorted.toString()).digest("hex");
}

function buildChainableQuery(result: { empty: boolean; docs: any[] }) {
  const queryObj: any = {
    get: vi.fn().mockResolvedValue(result),
  };
  queryObj.where = vi.fn().mockReturnValue(queryObj);
  queryObj.limit = vi.fn().mockReturnValue(queryObj);
  return queryObj;
}

function buildMockDb(existingDocs: any[] = []) {
  const addMock = vi.fn().mockResolvedValue({ id: "new-conn-id" });
  const updateMock = vi.fn().mockResolvedValue(undefined);

  const queryResult = buildChainableQuery({
    empty: existingDocs.length === 0,
    docs: existingDocs.map((data, i) => ({
      id: `existing-${i}`,
      data: () => data,
      ref: { update: updateMock },
    })),
  });

  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(queryResult),
          add: addMock,
        }),
      }),
    }),
    _addMock: addMock,
    _updateMock: updateMock,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = {
    ...originalEnv,
    SHOPIFY_API_KEY: "test_api_key",
    SHOPIFY_API_SECRET: "test_api_secret",
  };
  mockGetAdminDB.mockResolvedValue(buildMockDb());
  mockVerifyIdToken.mockResolvedValue({ uid: "user-123" });
  mockRegisterShopifyWebhooks.mockResolvedValue({ registered: [], failed: [] });
});

afterEach(() => {
  process.env = originalEnv;
});

describe("/api/store/shopify/callback", () => {
  it("redirects with error when parameters are missing", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/store/shopify/callback") as any;
    req.nextUrl = new URL("http://localhost/api/store/shopify/callback");
    req.cookies = { get: () => undefined };

    const response = await GET(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location") || "";
    expect(location).toContain("shopify_error=missing_parameters");
  });

  it("redirects with error when API keys are not configured", async () => {
    delete process.env.SHOPIFY_API_KEY;
    delete process.env.SHOPIFY_API_SECRET;

    const params = new URLSearchParams({
      code: "auth_code_123",
      shop: "test.myshopify.com",
      state: "state_123",
      hmac: "dummy",
    });

    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/store/shopify/callback?${params}`) as any;
    req.nextUrl = new URL(`http://localhost/api/store/shopify/callback?${params}`);
    req.cookies = { get: () => undefined };

    const response = await GET(req);
    const location = response.headers.get("location") || "";
    expect(location).toContain("shopify_error=shopify_not_configured");
  });

  it("redirects with error when state does not match", async () => {
    const hmac = generateCallbackHmac(
      { code: "auth_code", shop: "test.myshopify.com", state: "wrong_state" },
      "test_api_secret"
    );
    const params = new URLSearchParams({
      code: "auth_code",
      shop: "test.myshopify.com",
      state: "wrong_state",
      hmac,
    });

    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/store/shopify/callback?${params}`) as any;
    req.nextUrl = new URL(`http://localhost/api/store/shopify/callback?${params}`);
    req.cookies = {
      get: (name: string) => {
        if (name === "shopify_oauth_state") return { value: "correct_state" };
        if (name === "shopify_shop") return { value: "test.myshopify.com" };
        return undefined;
      },
    };

    const response = await GET(req);
    const location = response.headers.get("location") || "";
    expect(location).toContain("shopify_error=invalid_state");
  });

  it("redirects with error when shop does not match saved shop", async () => {
    const hmac = generateCallbackHmac(
      { code: "auth_code", shop: "hacker.myshopify.com", state: "state_123" },
      "test_api_secret"
    );
    const params = new URLSearchParams({
      code: "auth_code",
      shop: "hacker.myshopify.com",
      state: "state_123",
      hmac,
    });

    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/store/shopify/callback?${params}`) as any;
    req.nextUrl = new URL(`http://localhost/api/store/shopify/callback?${params}`);
    req.cookies = {
      get: (name: string) => {
        if (name === "shopify_oauth_state") return { value: "state_123" };
        if (name === "shopify_shop") return { value: "legitimate.myshopify.com" };
        return undefined;
      },
    };

    const response = await GET(req);
    const location = response.headers.get("location") || "";
    expect(location).toContain("shopify_error=shop_mismatch");
  });

  it("exchanges code for token and saves to Firestore", async () => {
    const hmac = generateCallbackHmac(
      { code: "valid_code", shop: "test.myshopify.com", state: "state_abc" },
      "test_api_secret"
    );
    const params = new URLSearchParams({
      code: "valid_code",
      shop: "test.myshopify.com",
      state: "state_abc",
      hmac,
    });

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: "shpat_new_token", scope: "read_products,write_products" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ shop: { name: "Test Store", email: "store@test.com" } }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/store/shopify/callback?${params}`) as any;
    req.nextUrl = new URL(`http://localhost/api/store/shopify/callback?${params}`);
    req.cookies = {
      get: (name: string) => {
        if (name === "shopify_oauth_state") return { value: "state_abc" };
        if (name === "shopify_shop") return { value: "test.myshopify.com" };
        if (name === "shopify_id_token") return { value: "firebase_id_token" };
        return undefined;
      },
    };

    const response = await GET(req);
    expect(response.status).toBe(307);
    const location = response.headers.get("location") || "";
    expect(location).toContain("shopify_connected=");
  });

  it("redirects with error when token exchange fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve("invalid code"),
    }));

    const hmac = generateCallbackHmac(
      { code: "bad_code", shop: "test.myshopify.com", state: "state_xyz" },
      "test_api_secret"
    );
    const params = new URLSearchParams({
      code: "bad_code",
      shop: "test.myshopify.com",
      state: "state_xyz",
      hmac,
    });

    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/store/shopify/callback?${params}`) as any;
    req.nextUrl = new URL(`http://localhost/api/store/shopify/callback?${params}`);
    req.cookies = {
      get: (name: string) => {
        if (name === "shopify_oauth_state") return { value: "state_xyz" };
        if (name === "shopify_shop") return { value: "test.myshopify.com" };
        return undefined;
      },
    };

    const response = await GET(req);
    const location = response.headers.get("location") || "";
    expect(location).toContain("shopify_error=token_exchange_failed");
  });

  it("cleans up cookies after successful connection", async () => {
    const hmac = generateCallbackHmac(
      { code: "valid_code", shop: "test.myshopify.com", state: "state_abc" },
      "test_api_secret"
    );
    const params = new URLSearchParams({
      code: "valid_code",
      shop: "test.myshopify.com",
      state: "state_abc",
      hmac,
    });

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: "shpat_new_token", scope: "read_products" }),
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ shop: { name: "Test Store", email: "" } }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/store/shopify/callback?${params}`) as any;
    req.nextUrl = new URL(`http://localhost/api/store/shopify/callback?${params}`);
    req.cookies = {
      get: (name: string) => {
        if (name === "shopify_oauth_state") return { value: "state_abc" };
        if (name === "shopify_shop") return { value: "test.myshopify.com" };
        if (name === "shopify_id_token") return { value: "firebase_id_token" };
        return undefined;
      },
    };

    const response = await GET(req);
    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("shopify_oauth_state=;");
    expect(setCookie).toContain("shopify_shop=;");
    expect(setCookie).toContain("shopify_id_token=;");
  });

  it("redirects with error when unauthorized (no idToken)", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("invalid token"));

    const hmac = generateCallbackHmac(
      { code: "valid_code", shop: "test.myshopify.com", state: "state_abc" },
      "test_api_secret"
    );
    const params = new URLSearchParams({
      code: "valid_code",
      shop: "test.myshopify.com",
      state: "state_abc",
      hmac,
    });

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: "shpat_new_token", scope: "read_products" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ shop: { name: "Test Store", email: "" } }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/store/shopify/callback?${params}`) as any;
    req.nextUrl = new URL(`http://localhost/api/store/shopify/callback?${params}`);
    req.cookies = {
      get: (name: string) => {
        if (name === "shopify_oauth_state") return { value: "state_abc" };
        if (name === "shopify_shop") return { value: "test.myshopify.com" };
        return undefined;
      },
    };

    const response = await GET(req);
    const location = response.headers.get("location") || "";
    expect(location).toContain("shopify_error=unauthorized");
  });

  it("updates existing store connection instead of creating new one", async () => {
    const existingDoc = {
      platform: "shopify",
      storeDomain: "test.myshopify.com",
      accessToken: "old_token",
    };
    const mockUpdate = vi.fn().mockResolvedValue(undefined);

    const queryResult = buildChainableQuery({
      empty: false,
      docs: [{ id: "existing-1", data: () => existingDoc, ref: { update: mockUpdate } }],
    });

    mockGetAdminDB.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue(queryResult),
            add: vi.fn().mockResolvedValue({ id: "new-id" }),
          }),
        }),
      }),
    });

    const hmac = generateCallbackHmac(
      { code: "valid_code", shop: "test.myshopify.com", state: "state_abc" },
      "test_api_secret"
    );
    const params = new URLSearchParams({
      code: "valid_code",
      shop: "test.myshopify.com",
      state: "state_abc",
      hmac,
    });

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: "shpat_new_token", scope: "read_products" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ shop: { name: "Test Store", email: "" } }),
      });
    vi.stubGlobal("fetch", mockFetch);

    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/store/shopify/callback?${params}`) as any;
    req.nextUrl = new URL(`http://localhost/api/store/shopify/callback?${params}`);
    req.cookies = {
      get: (name: string) => {
        if (name === "shopify_oauth_state") return { value: "state_abc" };
        if (name === "shopify_shop") return { value: "test.myshopify.com" };
        if (name === "shopify_id_token") return { value: "firebase_id_token" };
        return undefined;
      },
    };

    const response = await GET(req);
    expect(response.status).toBe(307);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
