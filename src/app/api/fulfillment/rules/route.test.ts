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

function makeRequest(method: string, url: string, body?: any) {
  const parsedUrl = new URL(url);
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  const req = new Request(url, init) as any;
  req.nextUrl = parsedUrl;
  return req;
}

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d, exists: true }));
}

const defaultRules = [
  {
    id: "rule_cj_primary",
    name: "CJ Dropshipping Primary",
    description: "Route to CJ when in stock and reliable",
    enabled: true,
    priority: 1,
    conditions: [
      { field: "supplier_id", operator: "equals", value: "cj" },
      { field: "stock_level", operator: "greater_than", value: 0 },
      { field: "supplier_reliability", operator: "greater_or_equal", value: 80 },
    ],
    actions: [
      { type: "route_to_supplier", params: { supplierId: "cj" } },
      { type: "auto_approve", params: { enabled: true } },
    ],
    fallbackAction: { type: "route_to_supplier", params: { supplierId: "aliexpress" } },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("/api/fulfillment/rules", () => {
  let mockDb: any;
  let rulesCol: any;
  let ruleDoc: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    ruleDoc = {
      get: vi.fn().mockResolvedValue({ exists: true, data: () => defaultRules[0] }),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    rulesCol = {
      orderBy: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: buildMockDocs(defaultRules), empty: false }),
      doc: vi.fn().mockReturnValue(ruleDoc),
    };

    const mockUserDoc: any = {};
    mockUserDoc.collection = vi.fn().mockImplementation((name: string) => {
      if (name === "fulfillmentRules") return rulesCol;
      return { get: vi.fn().mockResolvedValue({ docs: [] }) };
    });

    mockDb = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockUserDoc),
      }),
    };

    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(mockDb),
    }));

    vi.doMock("@/lib/fulfillment/rules-engine", () => ({
      validateRule: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      createDefaultRules: vi.fn().mockReturnValue(defaultRules),
    }));
  });

  describe("GET", () => {
    it("returns existing rules", async () => {
      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/rules");
      const res = await GET(req);
      const json = await res.json();

      expect(json.rules).toHaveLength(1);
      expect(json.rules[0].id).toBe("rule_cj_primary");
    });

    it("seeds defaults when empty", async () => {
      const { createDefaultRules } = await import("@/lib/fulfillment/rules-engine");
      (createDefaultRules as any).mockReturnValue(defaultRules);

      rulesCol.get.mockResolvedValue({ docs: [], empty: true });

      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/rules");
      const res = await GET(req);
      const json = await res.json();

      expect(json.rules).toEqual(defaultRules);
      expect(rulesCol.doc().set).toHaveBeenCalled();
    });

    it("returns 500 on error", async () => {
      mockDb.collection.mockImplementation(() => {
        throw new Error("db error");
      });

      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/rules");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("creates rule with valid data", async () => {
      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/rules", {
        rule: {
          name: "Test Rule",
          description: "A test rule",
          enabled: true,
          priority: 10,
          conditions: [{ field: "supplier_id", operator: "equals", value: "cj" }],
          actions: [{ type: "auto_approve", params: { enabled: true } }],
          fallbackAction: null,
        },
      });
      const res = await POST(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.rule.name).toBe("Test Rule");
    });

    it("rejects invalid rule", async () => {
      const { validateRule } = await import("@/lib/fulfillment/rules-engine");
      (validateRule as any).mockReturnValue({ valid: false, errors: ["Rule name is required"] });

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/rules", {
        rule: { name: "", conditions: [], actions: [] },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when rule missing", async () => {
      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/rules", {});
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 500 on error", async () => {
      mockDb.collection.mockImplementation(() => {
        throw new Error("db error");
      });

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/rules", {
        rule: {
          name: "Test Rule",
          conditions: [{ field: "supplier_id", operator: "equals", value: "cj" }],
          actions: [{ type: "auto_approve", params: { enabled: true } }],
        },
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("PUT", () => {
    it("updates rule", async () => {
      const { PUT } = await import("./route");
      const req = makeRequest("PUT", "http://localhost/api/fulfillment/rules", {
        ruleId: "rule_cj_primary",
        updates: { name: "Updated Rule" },
      });
      const res = await PUT(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.rule.name).toBe("Updated Rule");
    });

    it("returns 404 when rule not found", async () => {
      ruleDoc.get.mockResolvedValue({ exists: false, data: () => null });

      const { PUT } = await import("./route");
      const req = makeRequest("PUT", "http://localhost/api/fulfillment/rules", {
        ruleId: "nonexistent",
        updates: { name: "Updated" },
      });
      const res = await PUT(req);
      expect(res.status).toBe(404);
    });

    it("returns 400 when ruleId missing", async () => {
      const { PUT } = await import("./route");
      const req = makeRequest("PUT", "http://localhost/api/fulfillment/rules", {
        updates: { name: "Updated" },
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when updates missing", async () => {
      const { PUT } = await import("./route");
      const req = makeRequest("PUT", "http://localhost/api/fulfillment/rules", {
        ruleId: "rule_cj_primary",
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 500 on error", async () => {
      mockDb.collection.mockImplementation(() => {
        throw new Error("db error");
      });

      const { PUT } = await import("./route");
      const req = makeRequest("PUT", "http://localhost/api/fulfillment/rules", {
        ruleId: "rule_cj_primary",
        updates: { name: "Updated" },
      });
      const res = await PUT(req);
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("deletes rule", async () => {
      const { DELETE } = await import("./route");
      const req = makeRequest("DELETE", "http://localhost/api/fulfillment/rules?ruleId=rule_cj_primary");
      const res = await DELETE(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(ruleDoc.delete).toHaveBeenCalled();
    });

    it("returns 400 when ruleId missing", async () => {
      const { DELETE } = await import("./route");
      const req = makeRequest("DELETE", "http://localhost/api/fulfillment/rules");
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 500 on error", async () => {
      mockDb.collection.mockImplementation(() => {
        throw new Error("db error");
      });

      const { DELETE } = await import("./route");
      const req = makeRequest("DELETE", "http://localhost/api/fulfillment/rules?ruleId=rule_cj_primary");
      const res = await DELETE(req);
      expect(res.status).toBe(500);
    });
  });
});
