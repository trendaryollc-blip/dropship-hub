import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AI: { windowMs: 60000, maxRequests: 30 }, AI_CHAT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockConfirmExecution = vi.fn();
const mockCancelExecution = vi.fn();
const mockGetExecutionRecord = vi.fn();
const mockLogToolConfirmed = vi.fn();
const mockLogToolCancelled = vi.fn();
const mockGetAutonomyLevel = vi.fn();

vi.mock("@/lib/ai/engine/runner", () => ({
  confirmExecution: mockConfirmExecution,
  cancelExecution: mockCancelExecution,
  getExecutionRecord: mockGetExecutionRecord,
}));

vi.mock("@/lib/ai/safety/audit-log", () => ({
  logToolConfirmed: mockLogToolConfirmed,
  logToolCancelled: mockLogToolCancelled,
}));

vi.mock("@/lib/ai/modes/user-prefs", () => ({
  getAutonomyLevel: mockGetAutonomyLevel,
}));

vi.mock("@/lib/validation", () => ({
  validateBody: vi.fn((schema: any, body: any) => {
    if (!body?.executionId || !body?.action) {
      return { success: false, response: { status: () => ({ json: () => ({ error: "Validation failed" }) }) } };
    }
    return { success: true, data: body };
  }),
}));

describe("POST /api/ai/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAutonomyLevel.mockResolvedValue("ai_assist");
  });

  it("confirms a pending execution", async () => {
    mockConfirmExecution.mockResolvedValue({
      executionRecord: { toolId: "test-tool" },
      result: { success: true, summary: "Done", data: {} },
    });

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ executionId: "exec-1", action: "confirm" }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.result.tool).toBe("test-tool");
    expect(mockLogToolConfirmed).toHaveBeenCalled();
  });

  it("returns 404 when execution not found on confirm", async () => {
    mockConfirmExecution.mockResolvedValue(null);

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ executionId: "exec-999", action: "confirm" }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(body.error).toContain("not found");
  });

  it("cancels a pending execution", async () => {
    mockCancelExecution.mockResolvedValue(true);
    mockGetExecutionRecord.mockResolvedValue({ toolId: "test-tool" });

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ executionId: "exec-2", action: "cancel" }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(mockLogToolCancelled).toHaveBeenCalled();
  });

  it("validates request body", async () => {
    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({}) } as any;
    const res = await POST(req);

    expect(res.status).toBeDefined();
  });
});

describe("GET /api/ai/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns execution record when found", async () => {
    mockGetExecutionRecord.mockResolvedValue({ toolId: "tool-1", status: "pending" });

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/confirm?executionId=exec-1");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.record).toBeDefined();
    expect(body.record.toolId).toBe("tool-1");
  });

  it("returns 404 when execution not found", async () => {
    mockGetExecutionRecord.mockResolvedValue(null);

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/confirm?executionId=exec-999");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.error).toBe("Not found");
  });

  it("returns 400 when executionId missing", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/confirm");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.error).toContain("required");
  });
});
