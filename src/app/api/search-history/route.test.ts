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
  userDoc.collection = vi.fn().mockImplementation((name: string) => {
    const chain = buildQueryChain(collectionMap[name] || []);
    chain.add = vi.fn().mockResolvedValue({ id: "new-doc-1" });
    return chain;
  });
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(userDoc),
    }),
  };
}

describe("GET /api/search-history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns search history entries", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          searchHistory: [{ id: "s1", query: "wireless speaker", source: "topbar", createdAt: "2025-01-01" }],
        })
      ),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/search-history");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.entries).toHaveLength(1);
    expect(json.entries[0].query).toBe("wireless speaker");
  });

  it("returns empty array when no history exists", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/search-history");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.entries).toEqual([]);
  });
});

describe("POST /api/search-history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 400 when query is empty", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/search-history", {
      method: "POST",
      body: JSON.stringify({ query: "" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("query is required");
  });

  it("saves a search entry successfully", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/search-history", {
      method: "POST",
      body: JSON.stringify({ query: "bluetooth headphones", source: "search", resultCount: 42 }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
  });
});
