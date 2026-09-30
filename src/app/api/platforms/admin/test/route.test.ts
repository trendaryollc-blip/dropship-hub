import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  verifyAuth: vi.fn(),
  isOwner: vi.fn(),
}));

vi.mock("@/lib/platform-config", () => ({
  markKeyHealthy: vi.fn(),
  markKeyError: vi.fn(),
}));

vi.mock("@/lib/supplier-provider-keys", () => ({
  setSupplierProviderKeyResult: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Admin Test API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("POST returns 401 when not authenticated", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    vi.mocked(verifyAuth).mockResolvedValue(null);
    const { POST } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("POST returns 403 when not owner", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    vi.mocked(verifyAuth).mockResolvedValue("user-123");
    vi.mocked(isOwner).mockResolvedValue(false);
    const { POST } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("POST returns 400 when method is missing", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    vi.mocked(verifyAuth).mockResolvedValue("owner-123");
    vi.mocked(isOwner).mockResolvedValue(true);
    const { POST } = await import("./route");
    const req = { headers: new Headers(), json: async () => ({}) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST tests rainforest API key successfully", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    const { markKeyHealthy } = await import("@/lib/platform-config");
    vi.mocked(verifyAuth).mockResolvedValue("owner-123");
    vi.mocked(isOwner).mockResolvedValue(true);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ search_results: [] }),
    });
    const { POST } = await import("./route");
    const req = { headers: new Headers(), json: async () => ({ platformId: "amazon", keyId: "k1", key: "test-key", method: "rainforest" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(markKeyHealthy).toHaveBeenCalledWith("amazon", "k1");
  });

  it("supplier_provider tests a scraperapi key without touching platform health", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    const { markKeyHealthy, markKeyError } = await import("@/lib/platform-config");
    const { setSupplierProviderKeyResult } = await import("@/lib/supplier-provider-keys");
    vi.mocked(verifyAuth).mockResolvedValue("owner-123");
    vi.mocked(isOwner).mockResolvedValue(true);
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "ok" });
    const { POST } = await import("./route");
    const req = {
      headers: new Headers(),
      json: async () => ({
        platformId: "scraperapi",
        keyId: "skey_1",
        key: "test-key",
        method: "supplier_provider",
      }),
    } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("api.scraperapi.com"),
      expect.anything()
    );
    expect(markKeyHealthy).not.toHaveBeenCalled();
    expect(markKeyError).not.toHaveBeenCalled();
    expect(setSupplierProviderKeyResult).toHaveBeenCalledWith(
      "scraperapi",
      "skey_1",
      true,
      expect.any(String)
    );
  });

  it("supplier_provider reports placeholder providers as not connected without calling an API", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    const { markKeyHealthy, markKeyError } = await import("@/lib/platform-config");
    const { setSupplierProviderKeyResult } = await import("@/lib/supplier-provider-keys");
    vi.mocked(verifyAuth).mockResolvedValue("owner-123");
    vi.mocked(isOwner).mockResolvedValue(true);
    const { POST } = await import("./route");
    const req = {
      headers: new Headers(),
      json: async () => ({
        platformId: "trendsi",
        keyId: "skey_2",
        key: "test-key",
        method: "supplier_provider",
      }),
    } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/not connected/i);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(markKeyHealthy).not.toHaveBeenCalled();
    expect(markKeyError).not.toHaveBeenCalled();
    expect(setSupplierProviderKeyResult).toHaveBeenCalledWith(
      "trendsi",
      "skey_2",
      false,
      expect.stringMatching(/not connected/i)
    );
  });
});
