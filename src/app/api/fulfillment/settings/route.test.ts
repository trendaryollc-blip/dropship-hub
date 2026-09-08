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
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init) as any;
}

describe("/api/fulfillment/settings", () => {
  let getAdminDB: any;
  let mockDb: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockDb = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue({
              get: vi.fn(),
              set: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        }),
      }),
    };

    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(mockDb),
    }));

    vi.doMock("@/types/fulfillment", async () => {
      const actual = await vi.importActual("@/types/fulfillment");
      return actual;
    });
  });

  describe("GET", () => {
    it("returns settings merged with defaults when config exists", async () => {
      const existingSettings = { autoApprove: { cj: false }, minReliabilityScore: 90 };
      const configDoc = mockDb.collection().doc().collection().doc();
      configDoc.get.mockResolvedValue({
        exists: true,
        data: () => existingSettings,
      });

      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/settings");
      const res = await GET(req);
      const json = await res.json();

      expect(json.settings).toBeDefined();
      expect(json.settings.minReliabilityScore).toBe(90);
      expect(json.settings.autoApprove).toEqual({ cj: false });
    });

    it("returns defaults when no config exists", async () => {
      const configDoc = mockDb.collection().doc().collection().doc();
      configDoc.get.mockResolvedValue({
        exists: false,
        data: () => null,
      });

      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/settings");
      const res = await GET(req);
      const json = await res.json();

      expect(json.settings).toBeDefined();
      expect(json.settings.minReliabilityScore).toBe(80);
    });

    it("returns 500 on error", async () => {
      mockDb.collection.mockImplementation(() => {
        throw new Error("db error");
      });

      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/settings");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("saves settings", async () => {
      const configDoc = mockDb.collection().doc().collection().doc();
      configDoc.set.mockResolvedValue(undefined);

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/settings", {
        settings: { minReliabilityScore: 95 },
      });
      const res = await POST(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(configDoc.set).toHaveBeenCalledWith(
        { minReliabilityScore: 95 },
        { merge: true }
      );
    });

    it("returns 400 when settings missing", async () => {
      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/settings", {});
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 500 on error", async () => {
      mockDb.collection.mockImplementation(() => {
        throw new Error("db error");
      });

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/settings", {
        settings: { minReliabilityScore: 95 },
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
