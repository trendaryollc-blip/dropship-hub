import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
}

function buildQueryChain(docs: any[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}

function buildMockDb(collectionMap: Record<string, any[]>) {
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => buildQueryChain(collectionMap[name] || []));
  return { collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }) };
}

describe("GET /api/customer-service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns overview stats with conversations", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        csConversations: [
          { id: "c1", status: "active", aiHandled: true, lastMessage: "hi" },
          { id: "c2", status: "escalated", aiHandled: false },
          { id: "c3", status: "resolved", aiHandled: true },
        ],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/customer-service?type=overview");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.stats).toBeDefined();
    expect(json.stats.activeConversations).toBe(1);
    expect(json.stats.escalatedQueue).toBe(1);
    expect(json.stats.resolvedToday).toBe(1);
  });

  it("returns conversations list when type=conversations", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        csConversations: [{ id: "c1", status: "active", createdAt: "2025-01-01" }],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/customer-service?type=conversations");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.conversations).toHaveLength(1);
    expect(json.conversations[0].id).toBe("c1");
  });

  it("returns empty messages when no conversationId provided", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(buildMockDb({}));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/customer-service?type=messages");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.messages).toEqual([]);
  });
});
