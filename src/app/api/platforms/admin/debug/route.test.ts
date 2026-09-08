import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  verifyAuth: vi.fn(),
  isOwner: vi.fn(),
}));

vi.mock("@/lib/platform-config", () => ({
  getAllPlatforms: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Admin Debug API Route", () => {
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

  it("POST returns no_key status for platforms without keys", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    const { getAllPlatforms } = await import("@/lib/platform-config");
    vi.mocked(verifyAuth).mockResolvedValue("owner-123");
    vi.mocked(isOwner).mockResolvedValue(true);
    vi.mocked(getAllPlatforms).mockResolvedValue([
      { id: "test-platform", name: "Test", method: "scraperapi", enabled: true, keys: [], lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: {} as any, updatedAt: {} as any },
    ] as any);
    const { POST } = await import("./route");
    const req = { headers: new Headers(), url: "http://localhost/api/platforms/admin/debug", json: async () => ({}) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].status).toBe("no_key");
  });

  it("POST tests specific platform when platformId provided", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    const { getAllPlatforms } = await import("@/lib/platform-config");
    vi.mocked(verifyAuth).mockResolvedValue("owner-123");
    vi.mocked(isOwner).mockResolvedValue(true);
    vi.mocked(getAllPlatforms).mockResolvedValue([
      { id: "cj", name: "CJ", method: "official_api", enabled: true, keys: [{ id: "k1", key: "test-key", label: "Primary", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "", lastError: null, lastTested: null, lastStatus: "untested" }], lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: {} as any, updatedAt: {} as any },
    ] as any);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: "OK" }),
    });
    const { POST } = await import("./route");
    const req = { headers: new Headers(), url: "http://localhost/api/platforms/admin/debug", json: async () => ({ platformId: "cj" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
  });
});
