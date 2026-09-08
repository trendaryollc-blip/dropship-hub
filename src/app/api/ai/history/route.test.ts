import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: {
    AI: { windowMs: 60000, maxRequests: 30 },
    AI_CHAT: { windowMs: 60000, maxRequests: 30 },
    DEFAULT: { windowMs: 60000, maxRequests: 60 },
  },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
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
  const batchOps: { ref: any; op: string }[] = [];
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockImplementation((name: string) => {
          return {
            ...buildQueryChain(collectionMap[name] || []),
            doc: vi.fn().mockReturnValue({}),
          };
        }),
      }),
    }),
    batch: vi.fn().mockReturnValue({
      delete: vi.fn().mockImplementation((ref: any) => { batchOps.push({ ref, op: "delete" }); }),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
    _batchOps: batchOps,
  };
}

describe("GET /api/ai/history", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns chat messages from Firestore", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({ chatHistory: [{ id: "m1", role: "user", content: "hello" }] })
      ),
    }));

    const { GET } = await import("./route");
    const req = {} as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.messages).toBeDefined();
    expect(body.messages.length).toBe(1);
  });

  it("returns empty array when no history exists", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({ chatHistory: [] })),
    }));

    const { GET } = await import("./route");
    const req = {} as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.messages).toEqual([]);
  });
});

describe("POST /api/ai/history", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("saves a message successfully", async () => {
    const addMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              add: addMock,
            }),
          }),
        }),
      }),
    }));

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ role: "user", content: "hi" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(addMock).toHaveBeenCalled();
  });

  it("returns 400 when role or content missing", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({}),
    }));

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ role: "user" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/ai/history", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("clears chat history in batches", async () => {
    vi.doMock("@/lib/firebase-admin", () => {
      let callCount = 0;
      return {
        getAdminDB: vi.fn().mockResolvedValue({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnThis(),
                get: vi.fn().mockImplementation(() => {
                  callCount++;
                  if (callCount === 1) {
                    return Promise.resolve({
                      size: 2,
                      docs: [
                        { ref: "ref-1" },
                        { ref: "ref-2" },
                      ],
                    });
                  }
                  return Promise.resolve({ size: 0, docs: [] });
                }),
              }),
            }),
          }),
          batch: vi.fn().mockReturnValue({
            delete: vi.fn(),
            commit: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };
    });

    const { DELETE } = await import("./route");
    const req = {} as any;
    const res = await DELETE(req);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
