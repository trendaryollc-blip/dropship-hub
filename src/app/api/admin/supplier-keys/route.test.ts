import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAdminDB } from "@/__tests__/test-utils";

vi.mock("@/lib/auth", () => ({
  requireOwner: (handler: any) => handler,
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

describe("Admin Supplier Keys API Route", () => {
  let mockDB: ReturnType<typeof createMockAdminDB>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockDB = createMockAdminDB();
  });

  it("GET returns all provider keys", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.providers).toBeDefined();
    expect(body.providers.rainforest).toBeDefined();
    expect(body.providers.serpapi).toBeDefined();
    expect(body.providers.scraperapi).toBeDefined();
  });

  it("GET returns empty keys for unconfigured providers", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.providers.rainforest.keys).toEqual([]);
    expect(body.providers.rainforest.configured).toBe(false);
  });

  it("GET returns 12 providers", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);
    const body = await res.json();
    const providerCount = Object.keys(body.providers).length;
    expect(providerCount).toBe(12);
  });

  it("POST add_key returns 400 when provider invalid", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { POST } = await import("./route");
    const req = { json: async () => ({ action: "add_key", provider: "invalid", key: "abc" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST add_key returns 400 when key missing", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { POST } = await import("./route");
    const req = { json: async () => ({ action: "add_key", provider: "rainforest" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST add_key succeeds with valid data", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { POST } = await import("./route");
    const req = {
      json: async () => ({
        action: "add_key",
        provider: "rainforest",
        key: "test-api-key-123",
        label: "Test Key",
        requestsLimit: 500,
      }),
    } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("POST update_key returns 400 when keyId missing", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { POST } = await import("./route");
    const req = { json: async () => ({ action: "update_key", provider: "rainforest", updates: {} }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST update_key returns 400 when updates missing", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { POST } = await import("./route");
    const req = { json: async () => ({ action: "update_key", provider: "rainforest", keyId: "key-1" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST remove_key returns 400 when keyId missing", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { POST } = await import("./route");
    const req = { json: async () => ({ action: "remove_key", provider: "rainforest" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST reset_usage returns 400 when keyId missing", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { POST } = await import("./route");
    const req = { json: async () => ({ action: "reset_usage", provider: "rainforest" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST reorder_keys returns 400 when keyIds not array", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { POST } = await import("./route");
    const req = { json: async () => ({ action: "reorder_keys", provider: "rainforest", keyIds: "not-array" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for unknown action", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { POST } = await import("./route");
    const req = { json: async () => ({ action: "unknown", provider: "rainforest" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when provider missing", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { POST } = await import("./route");
    const req = { json: async () => ({ action: "add_key" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("GET handles all valid provider IDs", async () => {
    vi.mocked((await import("@/lib/firebase-admin")).getAdminDB).mockResolvedValue(mockDB as any);
    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);
    const body = await res.json();
    const validProviders = [
      "rainforest", "serpapi", "scraperapi", "serper", "rapidapi",
      "trendsi", "veridion", "supplierio", "salehoo", "spocket",
      "dataforseo", "ecomsource",
    ];
    for (const p of validProviders) {
      expect(body.providers[p]).toBeDefined();
    }
  });
});
