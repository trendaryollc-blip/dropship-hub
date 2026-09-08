import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { BILLING: { windowMs: 60000, maxRequests: 10 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockDelete = vi.fn();
const mockGet = vi.fn();
const mockCommit = vi.fn();
const mockBatch = vi.fn(() => ({ delete: vi.fn(), commit: mockCommit }));
const mockDoc = vi.fn(() => ({ get: mockGet, delete: mockDelete, collection: mockSubCollection }));
const mockSubCollection = vi.fn(() => ({
  limit: vi.fn().mockReturnValue({ get: mockGet }),
}));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

const mockDeleteUser = vi.fn();
vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection, batch: mockBatch }),
  getAdminAuth: vi.fn().mockReturnValue({ deleteUser: mockDeleteUser }),
}));

describe("/api/settings/delete-account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGet.mockResolvedValue({ size: 0, docs: [] });
    mockDelete.mockResolvedValue(undefined);
    mockCommit.mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);
  });

  it("POST deletes account", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/settings/delete-account", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST returns 500 on error", async () => {
    mockDelete.mockRejectedValue(new Error("Delete failed"));
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/settings/delete-account", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(500);
  });
});
