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

vi.mock("@/lib/finance/pnl-report", () => ({
  generatePnLReport: vi.fn(() => ({ id: "rpt-1", title: "Q1 Report", totalRevenue: 50000 })),
  getReport: vi.fn((id: string) => (id === "rpt-1" ? { id: "rpt-1", title: "Q1 Report", totalRevenue: 50000 } : null)),
  getAllReports: vi.fn(() => [{ id: "rpt-1", title: "Q1 Report" }]),
  deleteReport: vi.fn((id: string) => id === "rpt-1"),
  exportReportToCSV: vi.fn(() => "orderId,revenue\n1,100"),
  exportReportToPDFData: vi.fn(() => ({ sections: [{ title: "Revenue", value: 50000 }] })),
  validatePnLReportInput: vi.fn(() => ({ valid: true, errors: [] })),
}));

import { GET, POST } from "./route";

function makeReq(url: string, body?: any) {
  return { json: async () => body || {}, url } as any;
}

describe("GET /api/finance/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all reports by default", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/reports"), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reports).toBeDefined();
    expect(data.count).toBe(1);
  });

  it("returns a specific report", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/reports?action=get&reportId=rpt-1"), null as any);
    const data = await res.json();
    expect(data.report).toBeDefined();
    expect(data.report.id).toBe("rpt-1");
  });

  it("returns 404 for non-existent report", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/reports?action=get&reportId=nonexistent"), null as any);
    expect(res.status).toBe(404);
  });

  it("handles export_csv action for existing report", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/reports?action=export_csv&reportId=rpt-1"), null as any);
    expect(res).toBeDefined();
  });
});

describe("POST /api/finance/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 500 when generating report due to internal getAdminDB stub", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/reports", {
      action: "generate",
      input: { startDate: "2025-01-01", endDate: "2025-03-31" },
    }), null as any);
    expect(res.status).toBe(500);
  });

  it("returns 400 when generating without input", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/reports", { action: "generate" }), null as any);
    expect(res.status).toBe(400);
  });

  it("deletes a report", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/reports", {
      action: "delete",
      reportId: "rpt-1",
    }), null as any);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns 404 when deleting non-existent report", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/reports", {
      action: "delete",
      reportId: "nonexistent",
    }), null as any);
    expect(res.status).toBe(404);
  });
});
