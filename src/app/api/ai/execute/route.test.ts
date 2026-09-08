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

vi.mock("@/lib/validation", () => ({
  validateBody: vi.fn((_schema: any, body: any) => ({ success: true, data: body })),
}));

vi.mock("@/lib/ai/engine/runner", () => ({
  runTool: vi.fn().mockResolvedValue({
    result: { success: true, summary: "Tool executed", data: { ok: true } },
    executionRecord: { id: "exec-1" },
    needsConfirmation: false,
    confirmationReason: null,
  }),
  confirmExecution: vi.fn(),
  cancelExecution: vi.fn(),
}));

vi.mock("@/lib/ai/engine/executor", () => ({
  getRecentExecutions: vi.fn().mockResolvedValue([{ id: "exec-1" }]),
  getPendingConfirmations: vi.fn().mockResolvedValue([]),
  executeToolCalls: vi.fn().mockResolvedValue({
    results: [],
    summary: "Done",
    totalExecuted: 0,
    totalFailed: 0,
    totalPendingConfirmation: 0,
  }),
  parseToolCalls: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/ai/modes/user-prefs", () => ({
  getAutonomyLevel: vi.fn().mockResolvedValue("semi-autonomous"),
  getModePreferences: vi.fn().mockResolvedValue({
    guardrails: { dollarThresholdForConfirmation: 50 },
  }),
}));

vi.mock("@/lib/ai/modes/evaluator", () => ({
  evaluateToolExecution: vi.fn().mockResolvedValue({ shouldExecute: true, mode: "ai_assist", reason: "" }),
  toolIdToFeature: vi.fn().mockReturnValue("general"),
}));

describe("POST /api/ai/execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when no tool or llmResponse provided", async () => {
    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({}) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("Provide either");
  });

  it("executes a single tool successfully", async () => {
    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ tool: "create_product", input: { name: "Test" } }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.executionId).toBeDefined();
  });

  it("parses tool calls from llmResponse", async () => {
    const { parseToolCalls, executeToolCalls } = await import("@/lib/ai/engine/executor");
    (parseToolCalls as any).mockReturnValue([{ id: "tc-1", tool: "create_product", input: {} }]);
    (executeToolCalls as any).mockResolvedValue({
      results: [{ toolCall: { tool: "create_product" }, result: { success: true, summary: "ok" }, executionRecord: { id: "e1" } }],
      summary: "Done",
      totalExecuted: 1,
      totalFailed: 0,
      totalPendingConfirmation: 0,
    });

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ llmResponse: "some response" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.totalExecuted).toBe(1);
  });

  it("returns 403 when evaluator denies execution", async () => {
    const { evaluateToolExecution } = await import("@/lib/ai/modes/evaluator");
    (evaluateToolExecution as any).mockResolvedValue({ shouldExecute: false, mode: "supervised", reason: "Not allowed" });

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ tool: "delete_product", input: {} }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/ai/execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns recent executions by default", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/ai/execute" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.executions).toBeDefined();
  });

  it("returns pending confirmations when action=pending", async () => {
    const { getPendingConfirmations } = await import("@/lib/ai/engine/executor");
    (getPendingConfirmations as any).mockResolvedValue([{ id: "pending-1" }]);

    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/ai/execute?action=pending" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.pending).toHaveLength(1);
  });
});
