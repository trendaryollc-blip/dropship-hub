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

vi.mock("@/lib/validation", () => ({
  validateBody: vi.fn((schema: any, body: any) => ({ success: true, data: body })),
  KnowledgeBaseInputSchema: {},
}));

vi.mock("@/lib/data/cs-enhanced", () => ({
  addKnowledgeBaseEntry: vi.fn().mockResolvedValue("kb-1"),
  getKnowledgeBaseEntries: vi.fn().mockResolvedValue([{ id: "kb-1", title: "Shipping Policy", category: "shipping" }]),
  deleteKnowledgeBaseEntry: vi.fn().mockResolvedValue(true),
}));

describe("GET /api/customer-service/knowledge-base", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns knowledge base entries", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/customer-service/knowledge-base");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.entries).toHaveLength(1);
    expect(json.entries[0].title).toBe("Shipping Policy");
  });

  it("POST creates a new knowledge base entry", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/customer-service/knowledge-base", {
      method: "POST",
      body: JSON.stringify({ title: "Return Policy", category: "returns", content: "30 days" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.id).toBe("kb-1");
  });

  it("DELETE removes an entry by id", async () => {
    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/customer-service/knowledge-base?id=kb-1", {
      method: "DELETE",
    });
    const res = await DELETE(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
  });
});
