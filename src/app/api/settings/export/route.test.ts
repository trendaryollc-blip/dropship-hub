import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { BILLING: { windowMs: 60000, maxRequests: 10 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockGet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet, collection: mockSubCollection }));
const mockSubCollection = vi.fn(() => ({ limit: vi.fn().mockReturnValue({ get: mockGet }) }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection }),
}));

describe("/api/settings/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ name: "Test User" }),
      docs: [{ id: "doc1", data: () => ({ title: "Item 1" }) }],
    });
  });

  it("GET returns exported data", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/settings/export");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("GET returns 500 on error", async () => {
    mockGet.mockRejectedValue(new Error("DB error"));
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/settings/export");
    const response = await GET(request as any);
    expect(response.status).toBe(500);
  });
});
