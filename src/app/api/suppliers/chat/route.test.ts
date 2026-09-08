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
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}

function buildMockDb(collectionMap: Record<string, any[]>) {
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => buildQueryChain(collectionMap[name] || []));
  return { collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }) };
}

describe("GET /api/suppliers/chat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns conversations", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        supplierConversations: [
          { id: "c1", supplierId: "sup1", supplierName: "Test Supplier", subject: "General" },
        ],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/chat");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.conversations).toBeDefined();
    expect(json.conversations).toHaveLength(1);
  });

  it("returns messages when supplierId is provided", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        supplierMessages: [
          { id: "m1", body: "Hello", direction: "outgoing" },
        ],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/chat?supplierId=sup1");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.messages).toHaveLength(1);
  });
});

describe("POST /api/suppliers/chat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends a message", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    const setMock = vi.fn().mockResolvedValue(undefined);
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const docMock = vi.fn().mockReturnValue({ id: "msg-1", set: setMock, update: updateMock });
    const emptyQuery = { docs: [], empty: true, get: vi.fn() };

    const messagesCol = { doc: docMock };
    const convoWithWhere: any = {
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
        }),
      }),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
      doc: docMock,
    };
    const convoCol = {
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnValue(convoWithWhere),
      get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
      doc: vi.fn().mockReturnValue({
        id: "convo-1",
        set: setMock,
        update: updateMock,
        collection: vi.fn().mockReturnValue(messagesCol),
      }),
    };

    const colMap: Record<string, any> = {
      supplierConversations: convoCol,
      supplierMessages: messagesCol,
    };

    const userDoc: any = {};
    userDoc.collection = vi.fn().mockImplementation((name: string) => colMap[name] || { doc: docMock });
    (getAdminDB as any).mockResolvedValue({
      collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }),
    });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/chat", {
      method: "POST",
      body: JSON.stringify({
        supplierId: "sup1",
        supplierName: "Test",
        body: "Hello there",
      }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.message).toBeDefined();
  });

  it("returns 400 for missing fields", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/chat", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.error).toContain("Missing");
  });
});
