import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  verifyAuth: vi.fn(),
  isOwner: vi.fn(),
}));

vi.mock("@/lib/platform-config", () => ({
  createPlatform: vi.fn(),
  getAllPlatforms: vi.fn(),
  deletePlatform: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe("Admin Seed API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("POST returns 401 when not authenticated", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    vi.mocked(verifyAuth).mockResolvedValue(null);
    const { POST } = await import("./route");
    const req = { headers: new Headers(), url: "http://localhost/api/platforms/admin/seed" } as any;
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("POST returns 403 when not owner", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    vi.mocked(verifyAuth).mockResolvedValue("user-123");
    vi.mocked(isOwner).mockResolvedValue(false);
    const { POST } = await import("./route");
    const req = { headers: new Headers(), url: "http://localhost/api/platforms/admin/seed" } as any;
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("POST creates seed platforms successfully", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    const { createPlatform, getAllPlatforms } = await import("@/lib/platform-config");
    vi.mocked(verifyAuth).mockResolvedValue("owner-123");
    vi.mocked(isOwner).mockResolvedValue(true);
    vi.mocked(getAllPlatforms).mockResolvedValue([] as any);
    vi.mocked(createPlatform).mockResolvedValue({} as any);
    const { POST } = await import("./route");
    const req = { headers: new Headers(), url: "http://localhost/api/platforms/admin/seed" } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.created.length).toBeGreaterThan(0);
  });

  it("POST skips existing platforms on non-reset", async () => {
    const { verifyAuth, isOwner } = await import("@/lib/auth");
    const { createPlatform, getAllPlatforms } = await import("@/lib/platform-config");
    vi.mocked(verifyAuth).mockResolvedValue("owner-123");
    vi.mocked(isOwner).mockResolvedValue(true);
    vi.mocked(getAllPlatforms).mockResolvedValue([
      { id: "cj", name: "CJ Dropshipping" },
      { id: "amazon", name: "Amazon" },
    ] as any);
    vi.mocked(createPlatform).mockResolvedValue({} as any);
    const { POST } = await import("./route");
    const req = { headers: new Headers(), url: "http://localhost/api/platforms/admin/seed" } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.skipped.length).toBeGreaterThan(0);
  });
});
