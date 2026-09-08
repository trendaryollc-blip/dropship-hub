import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, DELETE, PATCH } from "./route";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        id: "generated-alert-id",
        set: vi.fn(async () => {}),
        get: vi.fn(async () => ({
          data: () => ({
            id: "alert-1",
            userId: "user-1",
            query: "test",
            platforms: ["amazon"],
            notifyOn: "any",
            isActive: true,
            createdAt: "2026-01-01T00:00:00Z",
          }),
        })),
        delete: vi.fn(async () => {}),
        update: vi.fn(async () => {}),
      })),
      where: vi.fn(() => ({
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
      })),
    })),
  })),
}));

function makeGetRequest(url: string) {
  return { url, method: "GET" } as any;
}

function makePostRequest(body: unknown) {
  return {
    url: "http://localhost/api/search/alerts",
    method: "POST",
    json: async () => body,
  } as any;
}

function makeDeleteRequest(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return {
    url: `http://localhost/api/search/alerts?${searchParams.toString()}`,
    method: "DELETE",
  } as any;
}

function makePatchRequest(body: unknown) {
  return {
    url: "http://localhost/api/search/alerts",
    method: "PATCH",
    json: async () => body,
  } as any;
}

describe("/api/search/alerts", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  describe("GET", () => {
    it("returns alerts for valid userId", async () => {
      const req = makeGetRequest("http://localhost/api/search/alerts?userId=user-1");
      const res = await GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.alerts).toBeDefined();
    });

    it("returns 401 for missing userId", async () => {
      const req = makeGetRequest("http://localhost/api/search/alerts");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  describe("POST", () => {
    it("creates alert with valid data", async () => {
      const req = makePostRequest({
        userId: "user-1",
        query: "earbuds",
        platforms: ["amazon"],
        notifyOn: "any",
      });
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.alert).toBeDefined();
      expect(data.alert.id).toBeTruthy();
    });

    it("returns 400 for missing fields", async () => {
      const req = makePostRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing query", async () => {
      const req = makePostRequest({ userId: "user-1" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("deletes alert by id", async () => {
      const req = makeDeleteRequest({ userId: "user-1", alertId: "alert-1" });
      const res = await DELETE(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 400 for missing params", async () => {
      const req = makeDeleteRequest({ userId: "user-1" });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH", () => {
    it("toggles alert active state", async () => {
      const req = makePatchRequest({ userId: "user-1", alertId: "alert-1", active: false });
      const res = await PATCH(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 400 for missing fields", async () => {
      const req = makePatchRequest({});
      const res = await PATCH(req);
      expect(res.status).toBe(400);
    });
  });
});
