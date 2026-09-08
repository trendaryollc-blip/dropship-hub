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
  EscalationRuleInputSchema: {},
}));

vi.mock("@/lib/data/cs-enhanced", () => ({
  addEscalationRule: vi.fn().mockResolvedValue("new-rule-1"),
  getEscalationRules: vi.fn().mockResolvedValue([{ id: "r1", keyword: "refund" }]),
  updateEscalationRule: vi.fn().mockResolvedValue(true),
  deleteEscalationRule: vi.fn().mockResolvedValue(true),
}));

describe("GET /api/customer-service/escalation-rules", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of escalation rules", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/customer-service/escalation-rules");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.rules).toHaveLength(1);
    expect(json.rules[0].id).toBe("r1");
  });

  it("POST creates a new rule", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/customer-service/escalation-rules", {
      method: "POST",
      body: JSON.stringify({ keyword: "broken", action: "escalate" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.id).toBe("new-rule-1");
  });

  it("DELETE removes a rule by id", async () => {
    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/customer-service/escalation-rules?id=r1", {
      method: "DELETE",
    });
    const res = await DELETE(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
  });
});
