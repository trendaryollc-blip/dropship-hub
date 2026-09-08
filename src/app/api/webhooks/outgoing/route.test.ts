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

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("crypto", () => ({
  default: { randomBytes: vi.fn().mockReturnValue({ toString: vi.fn().mockReturnValue("mock-secret-hex") }) },
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
  const addMock = vi.fn().mockResolvedValue({ id: "new-doc-1" });
  userDoc.add = addMock;
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(userDoc),
    }),
  };
}

describe("GET /api/webhooks/outgoing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of outgoing webhooks", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        outgoingWebhooks: [{ id: "wh1", url: "https://example.com/hook", events: ["order.created"], active: true }],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/webhooks/outgoing");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.webhooks).toHaveLength(1);
    expect(json.webhooks[0].url).toBe("https://example.com/hook");
  });
});

describe("POST /api/webhooks/outgoing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when url is missing", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/webhooks/outgoing", {
      method: "POST",
      body: JSON.stringify({ events: ["order.created"] }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("URL and events are required");
  });

  it("returns 400 when events array is empty", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/webhooks/outgoing", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com", events: [] }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
  });
});
