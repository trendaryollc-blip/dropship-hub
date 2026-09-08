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

vi.mock("@/lib/data/srm", () => ({
  getAutoSwitchRules: vi.fn(),
  addAutoSwitchRule: vi.fn(),
  updateAutoSwitchRule: vi.fn(),
  deleteAutoSwitchRule: vi.fn(),
  getSupplierScorecards: vi.fn(),
  addSupplierSwitchLog: vi.fn(),
}));

import { GET, POST, PUT, DELETE } from "./route";
import {
  getAutoSwitchRules, addAutoSwitchRule, updateAutoSwitchRule,
  deleteAutoSwitchRule, getSupplierScorecards, addSupplierSwitchLog,
} from "@/lib/data/srm";

function makeReq(body?: any, method = "POST", url = "http://localhost/api/srm/auto-switch") {
  return {
    json: vi.fn().mockResolvedValue(body ?? {}),
    url,
    method,
    nextUrl: new URL(url),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/srm/auto-switch", () => {
  it("returns auto-switch rules", async () => {
    (getAutoSwitchRules as any).mockResolvedValue([
      { id: "r1", supplierId: "s1", threshold: 70, metric: "overall_score", action: "notify" },
    ]);

    const res = await GET(makeReq(undefined, "GET"));
    const json = await res.json();
    expect(json.rules).toBeDefined();
    expect(json.rules.length).toBe(1);
  });
});

describe("POST /api/srm/auto-switch", () => {
  it("creates a new auto-switch rule", async () => {
    (addAutoSwitchRule as any).mockResolvedValue("rule-new-1");

    const res = await POST(makeReq({
      supplierId: "s1",
      supplierName: "Acme",
      threshold: 70,
      metric: "overall_score",
      action: "notify",
    }));

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.id).toBe("rule-new-1");
  });

  it("checks triggered rules against scorecards", async () => {
    (getAutoSwitchRules as any).mockResolvedValue([{
      id: "r1",
      supplierId: "s1",
      enabled: true,
      threshold: 80,
      metric: "overall_score",
      action: "auto_switch",
      triggerCount: 0,
    }]);
    (getSupplierScorecards as any).mockResolvedValue([{
      supplierId: "s1",
      overallScore: 65,
    }]);
    (updateAutoSwitchRule as any).mockResolvedValue(undefined);
    (addSupplierSwitchLog as any).mockResolvedValue(undefined);

    const res = await POST(makeReq({ action: "check" }));
    const json = await res.json();
    expect(json.triggered.length).toBe(1);
    expect(json.triggered[0].score).toBe(65);
    expect(json.totalChecked).toBe(1);
  });

  it("returns 400 for missing fields", async () => {
    const res = await POST(makeReq({}));
    const json = await res.json();
    expect(json.error).toContain("Missing required fields");
  });
});

describe("PUT /api/srm/auto-switch", () => {
  it("updates a rule", async () => {
    (updateAutoSwitchRule as any).mockResolvedValue(undefined);

    const res = await PUT(makeReq({ ruleId: "r1", threshold: 75 }));
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 400 without ruleId", async () => {
    const res = await PUT(makeReq({ threshold: 75 }));
    const json = await res.json();
    expect(json.error).toContain("ruleId required");
  });
});

describe("DELETE /api/srm/auto-switch", () => {
  it("deletes a rule", async () => {
    (deleteAutoSwitchRule as any).mockResolvedValue(undefined);

    const url = "http://localhost/api/srm/auto-switch?ruleId=r1";
    const res = await DELETE(makeReq(undefined, "DELETE", url));
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 400 without ruleId", async () => {
    const res = await DELETE(makeReq(undefined, "DELETE"));
    const json = await res.json();
    expect(json.error).toContain("ruleId required");
  });
});
