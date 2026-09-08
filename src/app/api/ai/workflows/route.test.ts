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

vi.mock("@/lib/ai/workflows/runner", () => ({
  executeWorkflow: vi.fn().mockResolvedValue({
    success: true,
    summary: "Workflow completed",
    steps: [],
  }),
}));

vi.mock("@/lib/ai/workflows/templates", () => ({
  getWorkflowTemplates: vi.fn().mockReturnValue([
    { id: "wf-1", name: "Product Launch", description: "Launch a product", steps: [{}] },
    { id: "wf-2", name: "Price Check", description: "Check pricing", steps: [{}] },
  ]),
  getWorkflowTemplate: vi.fn().mockImplementation((id: string) => {
    if (id === "wf-1") return { id: "wf-1", name: "Product Launch", description: "Launch a product", steps: [{}] };
    return null;
  }),
}));

describe("POST /api/ai/workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all workflow templates", async () => {
    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ action: "list" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.workflows.length).toBe(2);
    expect(body.workflows[0].id).toBe("wf-1");
  });

  it("gets a single workflow by id", async () => {
    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ action: "get", workflowId: "wf-1" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.workflow.id).toBe("wf-1");
  });

  it("returns 404 for unknown workflow", async () => {
    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ action: "get", workflowId: "nonexistent" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("executes a workflow successfully", async () => {
    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ action: "execute", workflowId: "wf-1", input: { product: "Test" } }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result).toBeDefined();
  });

  it("returns 400 for invalid action", async () => {
    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ action: "invalid" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
