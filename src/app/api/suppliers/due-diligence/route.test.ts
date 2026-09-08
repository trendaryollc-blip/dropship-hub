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

const mockGetDueDiligence = vi.fn();
const mockSaveDueDiligence = vi.fn();
const mockIsDueDiligenceFresh = vi.fn();
const mockGetSupplierById = vi.fn();
const mockGenerateDueDiligenceReport = vi.fn();

vi.mock("@/lib/data/supplier-due-diligence", () => ({
  getDueDiligence: (...args: any[]) => mockGetDueDiligence(...args),
  saveDueDiligence: (...args: any[]) => mockSaveDueDiligence(...args),
  isDueDiligenceFresh: (...args: any[]) => mockIsDueDiligenceFresh(...args),
}));

vi.mock("@/lib/supplier-service", () => ({
  getSupplierById: (...args: any[]) => mockGetSupplierById(...args),
}));

vi.mock("@/lib/ai/due-diligence", () => ({
  generateDueDiligenceReport: (...args: any[]) => mockGenerateDueDiligenceReport(...args),
}));

const mockReport = {
  supplierId: "cj-dropshipping",
  supplierName: "CJ Dropshipping",
  overallRiskScore: 30,
  riskLevel: "low",
  generatedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-01-08T00:00:00.000Z",
  redFlags: [],
  strengths: ["High reliability"],
  historyAnalysis: {
    reviewPattern: "organic",
    averageReviewAge: 30,
    refundTrend: "stable",
    priceStability: "stable",
    stockConsistency: 90,
  },
  recommendation: {
    verdict: "recommended",
    confidence: 85,
    summary: "Good supplier.",
    bestFor: ["Electronics"],
    avoidFor: [],
  },
  comparableSupplierIds: [],
};

describe("/api/suppliers/due-diligence", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetDueDiligence.mockResolvedValue(null);
    mockSaveDueDiligence.mockResolvedValue(undefined);
    mockIsDueDiligenceFresh.mockResolvedValue(false);
    mockGetSupplierById.mockResolvedValue({ id: "cj-dropshipping", name: "CJ Dropshipping" });
    mockGenerateDueDiligenceReport.mockResolvedValue({ report: mockReport, provider: "openai" });
  });

  it("GET returns 400 when supplierId is missing", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/due-diligence");
    const response = await GET(request as any);
    expect(response.status).toBe(400);
  });

  it("GET returns cached report when available", async () => {
    mockGetDueDiligence.mockResolvedValue({ ...mockReport, createdAt: new Date() });
    mockIsDueDiligenceFresh.mockResolvedValue(true);

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/due-diligence?supplierId=cj-dropshipping");
    const response = await GET(request as any);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.cached).toBe(true);
    expect(data.fresh).toBe(true);
    expect(data.report).toBeDefined();
  });

  it("GET returns null report when not cached", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/due-diligence?supplierId=cj-dropshipping");
    const response = await GET(request as any);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.cached).toBe(false);
    expect(data.report).toBeNull();
  });

  it("POST returns 404 when supplier not found", async () => {
    mockGetSupplierById.mockResolvedValue(null);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/due-diligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: "unknown" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(404);
  });

  it("POST generates and saves new report", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/due-diligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: "cj-dropshipping" }),
    });
    const response = await POST(request as any);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.cached).toBe(false);
    expect(data.provider).toBe("openai");
    expect(data.report.supplierId).toBe("cj-dropshipping");
    expect(mockSaveDueDiligence).toHaveBeenCalled();
  });

  it("POST skips generation when report is fresh (unless forceRefresh)", async () => {
    mockIsDueDiligenceFresh.mockResolvedValue(true);
    mockGetDueDiligence.mockResolvedValue({ ...mockReport, createdAt: new Date() });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/due-diligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: "cj-dropshipping" }),
    });
    const response = await POST(request as any);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.cached).toBe(true);
    expect(mockGenerateDueDiligenceReport).not.toHaveBeenCalled();
  });

  it("POST forces refresh when forceRefresh is true", async () => {
    mockIsDueDiligenceFresh.mockResolvedValue(true);
    mockGetDueDiligence.mockResolvedValue({ ...mockReport, createdAt: new Date() });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/due-diligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: "cj-dropshipping", forceRefresh: true }),
    });
    const response = await POST(request as any);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.cached).toBe(false);
    expect(mockGenerateDueDiligenceReport).toHaveBeenCalled();
  });

  it("POST returns 500 on generation error", async () => {
    mockGenerateDueDiligenceReport.mockRejectedValue(new Error("AI provider failed"));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/due-diligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: "cj-dropshipping" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(500);
  });

  it("POST returns 400 on invalid input", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/due-diligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST sets expiresAt to 7 days from now", async () => {
    const { POST } = await import("./route");
    const before = Date.now();
    const request = new Request("http://localhost/api/suppliers/due-diligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: "cj-dropshipping" }),
    });
    const response = await POST(request as any);
    const data = await response.json();
    const expiresAt = new Date(data.report.expiresAt).getTime();
    const expectedMin = before + 7 * 24 * 60 * 60 * 1000 - 5000;
    const expectedMax = before + 7 * 24 * 60 * 60 * 1000 + 5000;
    expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAt).toBeLessThanOrEqual(expectedMax);
  });
});
