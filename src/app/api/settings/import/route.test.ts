import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockSet = vi.fn();
const mockCommit = vi.fn().mockResolvedValue(undefined);
const mockBatch = vi.fn().mockReturnValue({ set: mockSet, commit: mockCommit });
const mockDoc = vi.fn().mockReturnValue({
  collection: vi.fn().mockReturnValue({
    doc: vi.fn().mockReturnValue({ id: "doc-id" }),
  }),
});
const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });

vi.doMock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection, batch: mockBatch }),
}));

function makeReq(url: string, init?: RequestInit) {
  const req = new Request(url, init);
  (req as any).nextUrl = new URL(url);
  return req;
}

describe("/api/settings/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 400 when data is missing", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection, batch: mockBatch }),
    }));

    const { POST } = await import("./route");
    const response = await POST(makeReq("http://localhost/api/settings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }) as any);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("data object required");
  });

  it("returns 400 when data is not an object", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection, batch: mockBatch }),
    }));

    const { POST } = await import("./route");
    const response = await POST(makeReq("http://localhost/api/settings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "not-an-object" }),
    }) as any);

    expect(response.status).toBe(400);
  });

  it("imports data and returns count", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection, batch: mockBatch }),
    }));

    const { POST } = await import("./route");
    const response = await POST(makeReq("http://localhost/api/settings/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          favorites: [{ id: "f1", name: "Item 1" }, { id: "f2", name: "Item 2" }],
          notes: [{ id: "n1", text: "Hello" }],
        },
      }),
    }) as any);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.imported).toBe(3);
    expect(mockBatch).toHaveBeenCalled();
    expect(mockCommit).toHaveBeenCalled();
  });
});
