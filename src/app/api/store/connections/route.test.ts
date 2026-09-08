import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUnregister = vi.fn().mockResolvedValue({ removed: 0, errors: [] });
const mockGetAdminDB = vi.fn();

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/shopify/webhooks", () => ({
  unregisterShopifyWebhooks: mockUnregister,
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: mockGetAdminDB,
}));

function makeRequest(url: string, method = "GET", body?: unknown) {
  const req = new Request(`http://localhost${url}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  }) as any;
  req.nextUrl = new URL(`http://localhost${url}`);
  return req;
}

describe("/api/store/connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockUnregister.mockResolvedValue({ removed: 0, errors: [] });
  });

  it("GET returns connections", async () => {
    mockGetAdminDB.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }),
        }),
      }),
    });

    const { GET } = await import("./route");
    const request = makeRequest("/api/store/connections");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.connections).toBeDefined();
    expect(Array.isArray(data.connections)).toBe(true);
  });

  it("POST creates a connection", async () => {
    mockGetAdminDB.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            add: vi.fn().mockResolvedValue({ id: "conn-1" }),
          }),
        }),
      }),
    });

    const { POST } = await import("./route");
    const request = makeRequest("/api/store/connections", "POST", {
      platform: "shopify",
      name: "My Store",
      url: "https://store.myshopify.com",
      accessToken: "shpat_xxx",
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("DELETE removes a connection", async () => {
    const deleteMock = vi.fn().mockResolvedValue(undefined);
    mockGetAdminDB.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
              delete: deleteMock,
            }),
            add: vi.fn(),
          }),
        }),
      }),
    });

    const { DELETE } = await import("./route");
    const request = makeRequest("/api/store/connections?storeId=conn-1", "DELETE");
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("DELETE returns 400 when storeId is missing", async () => {
    mockGetAdminDB.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue({
              get: vi.fn(),
              delete: vi.fn(),
            }),
            add: vi.fn(),
          }),
        }),
      }),
    });

    const { DELETE } = await import("./route");
    const request = makeRequest("/api/store/connections", "DELETE");
    const response = await DELETE(request);
    expect(response.status).toBe(400);
  });

  it("DELETE calls unregisterShopifyWebhooks for Shopify stores", async () => {
    const deleteMock = vi.fn().mockResolvedValue(undefined);
    mockGetAdminDB.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  platform: "shopify",
                  storeDomain: "test.myshopify.com",
                  accessToken: "shpat_test_token",
                }),
              }),
              delete: deleteMock,
            }),
            add: vi.fn(),
          }),
        }),
      }),
    });

    const { DELETE } = await import("./route");
    const request = makeRequest("/api/store/connections?storeId=shopify-conn", "DELETE");
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    expect(mockUnregister).toHaveBeenCalledWith("test.myshopify.com", "shpat_test_token");
  });

  it("DELETE does not call unregisterShopifyWebhooks for non-Shopify stores", async () => {
    const deleteMock = vi.fn().mockResolvedValue(undefined);
    mockGetAdminDB.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  platform: "woocommerce",
                  url: "https://store.example.com",
                }),
              }),
              delete: deleteMock,
            }),
            add: vi.fn(),
          }),
        }),
      }),
    });

    const { DELETE } = await import("./route");
    const request = makeRequest("/api/store/connections?storeId=woo-conn", "DELETE");
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    expect(mockUnregister).not.toHaveBeenCalled();
  });
});
