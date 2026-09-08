import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { FULFILLMENT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockCreateTemplate = vi.fn();
const mockGetTemplate = vi.fn();
const mockGetAllTemplates = vi.fn();
const mockUpdateTemplate = vi.fn();
const mockDeleteTemplate = vi.fn();
const mockDuplicateTemplate = vi.fn();
const mockExecuteTemplate = vi.fn();
const mockGetBatch = vi.fn();
const mockGetAllBatches = vi.fn();
const mockValidateTemplate = vi.fn();
const mockGetTemplateStats = vi.fn();

vi.mock("@/lib/fulfillment/sample-templates", () => ({
  createTemplate: (...args: any[]) => mockCreateTemplate(...args),
  getTemplate: (...args: any[]) => mockGetTemplate(...args),
  getAllTemplates: (...args: any[]) => mockGetAllTemplates(...args),
  updateTemplate: (...args: any[]) => mockUpdateTemplate(...args),
  deleteTemplate: (...args: any[]) => mockDeleteTemplate(...args),
  duplicateTemplate: (...args: any[]) => mockDuplicateTemplate(...args),
  executeTemplate: (...args: any[]) => mockExecuteTemplate(...args),
  getBatch: (...args: any[]) => mockGetBatch(...args),
  getAllBatches: (...args: any[]) => mockGetAllBatches(...args),
  validateTemplate: (...args: any[]) => mockValidateTemplate(...args),
  getTemplateStats: (...args: any[]) => mockGetTemplateStats(...args),
}));

function makeRequest(method: string, url: string, body?: any) {
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init) as any;
}

describe("GET /api/fulfillment/templates", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetAllTemplates.mockReturnValue([{ id: "t1", name: "Template 1" }]);
    mockGetTemplateStats.mockReturnValue({ total: 1 });
    mockGetTemplate.mockReturnValue({ id: "t1", name: "Template 1" });
    mockGetBatch.mockReturnValue({ id: "b1", status: "done" });
    mockGetAllBatches.mockReturnValue([{ id: "b1" }]);
  });

  it("returns templates for action=list", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/templates?action=list");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.templates).toHaveLength(1);
    expect(json.stats.total).toBe(1);
  });

  it("returns template for action=get", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/templates?action=get&templateId=t1");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.template.name).toBe("Template 1");
  });

  it("returns 404 for action=get unknown template", async () => {
    mockGetTemplate.mockReturnValue(null);
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/templates?action=get&templateId=unknown");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns batch for action=batch", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/templates?action=batch&batchId=b1");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.batch.status).toBe("done");
  });

  it("returns batches for action=batches", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/templates?action=batches");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.batches).toHaveLength(1);
  });

  it("returns stats for action=stats", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/templates?action=stats");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.stats.total).toBe(1);
  });

  it("returns 400 for invalid action", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/templates?action=bad");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/fulfillment/templates", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockValidateTemplate.mockReturnValue({ valid: true, errors: [] });
    mockCreateTemplate.mockReturnValue({ id: "t-new", name: "New" });
    mockUpdateTemplate.mockReturnValue({ id: "t1", name: "Updated" });
    mockDeleteTemplate.mockReturnValue(true);
    mockDuplicateTemplate.mockReturnValue({ id: "t-dup", name: "Copy of Template" });
    mockExecuteTemplate.mockResolvedValue({ id: "b2", status: "running" });
  });

  it("creates template for action=create", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/templates", {
      action: "create",
      template: { name: "New", products: [] },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.template.name).toBe("New");
  });

  it("returns 400 for action=create missing data", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/templates", {
      action: "create",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("updates template for action=update", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/templates", {
      action: "update",
      templateId: "t1",
      updates: { name: "Updated" },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.template.name).toBe("Updated");
  });

  it("deletes template for action=delete", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/templates", {
      action: "delete",
      templateId: "t1",
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe("Template deleted");
  });

  it("returns 404 for action=delete unknown template", async () => {
    mockDeleteTemplate.mockReturnValue(false);
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/templates", {
      action: "delete",
      templateId: "unknown",
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("duplicates template for action=duplicate", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/templates", {
      action: "duplicate",
      templateId: "t1",
      newName: "Copy of Template",
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.template.id).toBe("t-dup");
  });

  it("executes template for action=execute", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/templates", {
      action: "execute",
      templateId: "t1",
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.batch.status).toBe("running");
  });

  it("returns 400 for invalid action", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/templates", {
      action: "bad",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/fulfillment/templates", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockDeleteTemplate.mockReturnValue(true);
  });

  it("deletes template with valid templateId", async () => {
    const { DELETE } = await import("./route");
    const req = makeRequest("DELETE", "http://localhost/api/fulfillment/templates?templateId=t1");
    const res = await DELETE(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe("Template deleted");
  });

  it("returns 400 when templateId is missing", async () => {
    const { DELETE } = await import("./route");
    const req = makeRequest("DELETE", "http://localhost/api/fulfillment/templates");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown templateId", async () => {
    mockDeleteTemplate.mockReturnValue(false);
    const { DELETE } = await import("./route");
    const req = makeRequest("DELETE", "http://localhost/api/fulfillment/templates?templateId=unknown");
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });
});
