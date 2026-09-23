import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { GET, POST, DELETE, PATCH } from "./route";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "user-1");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(() => ({
    collection: vi.fn((name: string) => {
      const docStore = {
        id: "generated-alert-id",
        set: vi.fn(async () => {}),
        get: vi.fn(async () => ({
          data: () =>
            name === "users"
              ? null
              : {
                  id: "alert-1",
                  userId: "user-1",
                  query: "test",
                  platforms: ["amazon"],
                  notifyOn: "any",
                  isActive: true,
                  createdAt: "2026-01-01T00:00:00Z",
                },
        })),
        delete: vi.fn(async () => {}),
        update: vi.fn(async () => {}),
      };
      const whereStore = {
        get: vi.fn(async () => ({
          docs: [
            {
              data: () => ({
                id: "alert-1",
                userId: "user-1",
                query: "test",
                platforms: ["amazon"],
                notifyOn: "any",
                isActive: true,
                createdAt: "2026-01-01T00:00:00Z",
              }),
            },
          ],
        })),
      };
      if (name === "searchAlerts") {
        return {
          doc: vi.fn(() => docStore),
          where: vi.fn(() => whereStore),
        };
      }
      return {
        doc: vi.fn(() => ({
          ...docStore,
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({
              get: vi.fn(async () => ({ data: () => null })),
            })),
          })),
        })),
        where: vi.fn(() => whereStore),
      };
    }),
  })),
}));

function authedRequest(url: string, init: { method?: string; body?: unknown } = {}) {
  return {
    url,
    method: init.method || "GET",
    json: async () => init.body || {},
  } as any;
}

describe("/api/search/alerts", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  describe("GET", () => {
    it("returns alerts for valid userId", async () => {
      const req = authedRequest("http://localhost/api/search/alerts");
      const res: NextResponse = (await GET(req)) as NextResponse;
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.alerts).toBeDefined();
    });
  });

  describe("POST", () => {
    it("creates alert with valid data (uid from verified token, not body)", async () => {
      const req = authedRequest("http://localhost/api/search/alerts", {
        method: "POST",
        body: { userId: "attacker-uid", query: "earbuds", platforms: ["amazon"], notifyOn: "any" },
      });
      const res: NextResponse = (await POST(req)) as NextResponse;
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.alert).toBeDefined();
      expect(data.alert.userId).toBe("user-1");
      expect(data.alert.id).toBeTruthy();
    });

    it("returns 400 for missing fields", async () => {
      const req = authedRequest("http://localhost/api/search/alerts", {
        method: "POST",
        body: {},
      });
      const res: NextResponse = (await POST(req)) as NextResponse;
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing query", async () => {
      const req = authedRequest("http://localhost/api/search/alerts", {
        method: "POST",
        body: { platforms: ["amazon"] },
      });
      const res: NextResponse = (await POST(req)) as NextResponse;
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("deletes alert by id", async () => {
      const req = authedRequest("http://localhost/api/search/alerts?alertId=alert-1", { method: "DELETE" });
      const res: NextResponse = (await DELETE(req)) as NextResponse;
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 400 for missing params", async () => {
      const req = authedRequest("http://localhost/api/search/alerts", { method: "DELETE" });
      const res: NextResponse = (await DELETE(req)) as NextResponse;
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH", () => {
    it("toggles alert active state", async () => {
      const req = authedRequest("http://localhost/api/search/alerts", {
        method: "PATCH",
        body: { alertId: "alert-1", active: false },
      });
      const res: NextResponse = (await PATCH(req)) as NextResponse;
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 400 for missing fields", async () => {
      const req = authedRequest("http://localhost/api/search/alerts", {
        method: "PATCH",
        body: {},
      });
      const res: NextResponse = (await PATCH(req)) as NextResponse;
      expect(res.status).toBe(400);
    });
  });
});