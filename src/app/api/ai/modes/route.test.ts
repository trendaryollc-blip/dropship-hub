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

const mockGetModePreferences = vi.fn();
const mockSetGlobalMode = vi.fn();
const mockSetFeatureMode = vi.fn();
const mockSetAutonomyLevel = vi.fn();
const mockSetGuardrails = vi.fn();
const mockGetGuardrailStatus = vi.fn();

vi.mock("@/lib/ai/modes/user-prefs", () => ({
  getModePreferences: mockGetModePreferences,
  updateModePreferences: vi.fn(),
  setGlobalMode: mockSetGlobalMode,
  setFeatureMode: mockSetFeatureMode,
  setAutonomyLevel: mockSetAutonomyLevel,
  setGuardrails: mockSetGuardrails,
  addAutoRule: vi.fn(),
  updateAutoRule: vi.fn(),
  deleteAutoRule: vi.fn(),
}));

vi.mock("@/lib/ai/safety/guardrails", () => ({
  getGuardrailStatus: mockGetGuardrailStatus,
}));

vi.mock("@/lib/ai/tools/registry", () => ({
  ToolRegistry: {
    getDefinitions: vi.fn(() => [{ id: "tool-1", name: "Test Tool" }]),
    getCategories: vi.fn(() => ["general"]),
  },
}));

vi.mock("@/lib/validation", () => ({
  validateBody: vi.fn((schema: any, body: any) => {
    if (!body?.action) {
      return { success: false, response: { status: () => ({ json: () => ({ error: "Validation failed" }) }) } };
    }
    return { success: true, data: body };
  }),
}));

describe("GET /api/ai/modes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetModePreferences.mockResolvedValue({ globalMode: "ai_assist", autonomyLevel: 2 });
  });

  it("returns mode preferences by default", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/modes");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.preferences).toBeDefined();
    expect(body.preferences.globalMode).toBe("ai_assist");
  });

  it("returns guardrail status when action=guardrails", async () => {
    mockGetGuardrailStatus.mockResolvedValue({ blocked: 0, total: 10 });

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/modes?action=guardrails");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.blocked).toBe(0);
  });

  it("returns tools list when action=tools", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/modes?action=tools");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.tools).toBeDefined();
    expect(body.categories).toBeDefined();
  });
});

describe("PUT /api/ai/modes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetGlobalMode.mockResolvedValue({ globalMode: "auto", autonomyLevel: 4 });
    mockSetFeatureMode.mockResolvedValue({ globalMode: "ai_assist", features: { pricing: "auto" } });
    mockSetAutonomyLevel.mockResolvedValue({ globalMode: "ai_assist", autonomyLevel: 3 });
    mockSetGuardrails.mockResolvedValue({ globalMode: "ai_assist", guardrails: { maxActionsPerHour: 10 } });
  });

  it("sets global mode", async () => {
    const { PUT } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ action: "global", mode: "auto" }) } as any;
    const res = await PUT(req);
    const body = await res.json();

    expect(body.preferences.globalMode).toBe("auto");
    expect(mockSetGlobalMode).toHaveBeenCalledWith("test-user-123", "auto");
  });

  it("sets feature mode", async () => {
    const { PUT } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ action: "feature", feature: "pricing", mode: "auto" }) } as any;
    const res = await PUT(req);
    const body = await res.json();

    expect(body.preferences).toBeDefined();
    expect(mockSetFeatureMode).toHaveBeenCalled();
  });

  it("sets autonomy level", async () => {
    const { PUT } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ action: "autonomy", autonomyLevel: 3 }) } as any;
    const res = await PUT(req);
    const body = await res.json();

    expect(body.preferences.autonomyLevel).toBe(3);
  });

  it("validates request body", async () => {
    const { PUT } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({}) } as any;
    const res = await PUT(req);

    expect(res.status).toBeDefined();
  });
});
