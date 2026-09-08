import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AI_CHAT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/utils-helpers", () => ({
  safeNum: (v: unknown, fallback = 0) => (typeof v === "number" ? v : fallback),
  safeStr: (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback),
}));

const mockCollectionFn = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({
    collection: mockCollectionFn,
  }),
}));

function mockFirestore(scans: Record<string, any[]>) {
  mockCollectionFn.mockReturnValue({
    doc: vi.fn().mockReturnValue({
      collection: vi.fn().mockImplementation((name: string) => {
        const docs = (scans[name] || []).map((d) => ({ data: () => d }));
        return {
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ docs }),
        };
      }),
      set: vi.fn().mockResolvedValue(undefined),
    }),
  });
}

describe("/api/ai/scan", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("POST returns health scan with critical issues", async () => {
    mockFirestore({
      alerts: [{ type: "warning", title: "Low stock" }],
      supplierAlerts: [{ severity: "high", title: "Late shipment" }],
      lifecycleAlerts: [],
      csConversations: [{ status: "escalated" }],
      revenue: [{ amount: 100 }],
      storeConnections: [{ status: "connected" }],
      pushedProducts: [{ status: "error" }],
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/scan", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.hasChanges).toBe(true);
    expect(data.criticalCount).toBeGreaterThanOrEqual(3);
    expect(data.urgentActions.length).toBeGreaterThan(0);
    expect(data.scanTimestamp).toBeDefined();
    expect(data.summary).toContain("critical");
  });

  it("POST returns all clear when no issues", async () => {
    mockFirestore({
      alerts: [],
      supplierAlerts: [],
      lifecycleAlerts: [],
      csConversations: [],
      revenue: [],
      storeConnections: [{ status: "connected" }],
      pushedProducts: [],
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/scan", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.hasChanges).toBe(false);
    expect(data.criticalCount).toBe(0);
    expect(data.urgentActions).toHaveLength(0);
    expect(data.summary).toContain("All clear");
  });

  it("POST detects no connected stores as opportunity", async () => {
    mockFirestore({
      alerts: [],
      supplierAlerts: [],
      lifecycleAlerts: [],
      csConversations: [],
      revenue: [],
      storeConnections: [{ status: "disconnected" }],
      pushedProducts: [],
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/scan", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.newOpportunities).toContain("Connect your first store to start selling");
  });

  it("POST saves scan result to Firestore", async () => {
    const mockSet = vi.fn().mockResolvedValue(undefined);
    mockCollectionFn.mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({ docs: [] }),
        }),
        set: mockSet,
      }),
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/scan", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ lastScan: expect.any(Object) }),
      { merge: true }
    );
  });

  it("POST returns 500 on Firestore error", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockRejectedValue(new Error("DB connection failed"));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/scan", { method: "POST" });
    const response = await POST(request as any);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Scan failed");
  });
});
