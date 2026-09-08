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
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d, ref: { id: d.id || "doc-1" } }));
}

function buildQueryChain(docs: any[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}

function buildMockDb(collectionMap: Record<string, any[]>, userDoc: any = {}) {
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockImplementation((name: string) => {
          return {
            ...buildQueryChain(collectionMap[name] || []),
            doc: vi.fn().mockReturnValue({
              set: vi.fn().mockResolvedValue(undefined),
              get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
            }),
          };
        }),
        get: vi.fn().mockResolvedValue({ data: () => userDoc, exists: true }),
      }),
    }),
    batch: vi.fn().mockReturnValue({
      set: vi.fn(),
      update: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

describe("POST /api/ai/notifications", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("skips when notifications are disabled", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({}, { notifications: false })),
    }));

    const { POST } = await import("./route");
    const req = {} as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.skipped).toBe(true);
  });

  it("returns zero sent when no critical issues exist", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({
        alerts: [],
        supplierAlerts: [],
        csConversations: [],
        revenue: [],
        pushedProducts: [],
      })),
    }));

    const { POST } = await import("./route");
    const req = {} as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.sent).toBe(0);
  });

  it("generates notifications for escalated CS conversations", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({
        alerts: [],
        supplierAlerts: [],
        csConversations: [{ status: "escalated", customerName: "John" }],
        revenue: [],
        pushedProducts: [],
      })),
    }));

    const { POST } = await import("./route");
    const req = {} as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.sent).toBeGreaterThan(0);
    expect(body.notifications[0].severity).toBe("critical");
  });

  it("returns 500 on Firestore error", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("DB fail")),
    }));

    const { POST } = await import("./route");
    const req = {} as any;
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/ai/notifications", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns notifications with unread count", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({
        notifications: [
          { id: "n1", title: "Alert", read: false },
          { id: "n2", title: "Info", read: true },
        ],
      })),
    }));

    const { GET } = await import("./route");
    const req = {} as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.notifications).toHaveLength(2);
    expect(body.unreadCount).toBe(1);
  });
});

describe("PATCH /api/ai/notifications", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("marks all notifications as read", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              get: vi.fn().mockResolvedValue({
                size: 3,
                docs: [{ ref: "r1" }, { ref: "r2" }, { ref: "r3" }],
              }),
            }),
          }),
        }),
        batch: vi.fn().mockReturnValue({
          update: vi.fn(),
          commit: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    }));

    const { PATCH } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ markAll: true }) } as any;
    const res = await PATCH(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.marked).toBe(3);
  });

  it("returns 400 when no valid payload provided", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({}),
          }),
        }),
      }),
    }));

    const { PATCH } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({}) } as any;
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
