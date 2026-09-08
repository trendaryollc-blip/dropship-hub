import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  verifyAuth: vi.fn(),
  isOwner: vi.fn(),
}));

vi.mock("@/lib/platform-config", () => ({
  getAllPlatforms: vi.fn(),
  createPlatform: vi.fn(),
  updatePlatform: vi.fn(),
  deletePlatform: vi.fn(),
  addPlatformKey: vi.fn(),
  removePlatformKey: vi.fn(),
  updatePlatformKey: vi.fn(),
  reorderPlatformKeys: vi.fn(),
  resetKeyUsage: vi.fn(),
}));

describe("Admin Platform API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("GET returns 401 when not authenticated", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    vi.mocked(verifyAuth).mockResolvedValue(null);
    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("GET returns 403 when not owner", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    vi.mocked(verifyAuth).mockResolvedValue("user-123");
    vi.mocked(isOwner).mockResolvedValue(false);
    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("GET returns platforms list when authorized", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    const { getAllPlatforms } = await import("@/lib/platform-config");
    vi.mocked(verifyAuth).mockResolvedValue("owner-123");
    vi.mocked(isOwner).mockResolvedValue(true);
    vi.mocked(getAllPlatforms).mockResolvedValue([] as any);
    const { GET } = await import("./route");
    const req = { headers: new Headers() } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platforms).toEqual([]);
  });

  it("POST add_key returns 400 when platformId missing", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    vi.mocked(verifyAuth).mockResolvedValue("owner-123");
    vi.mocked(isOwner).mockResolvedValue(true);
    const { POST } = await import("./route");
    const req = { json: async () => ({ action: "add_key", key: "abc" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
