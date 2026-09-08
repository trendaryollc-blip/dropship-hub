import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.doMock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue(buildMockDb()),
}));

vi.doMock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

function buildMockDb(docExists = true) {
  const docRef: any = {
    get: vi.fn().mockResolvedValue({ exists: docExists, data: () => ({ url: "https://old.com" }) }),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(docRef) });
  return {
    collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }),
  };
}

function makeReq(method: string, id: string, body?: any) {
  const url = new URL(`http://localhost/api/webhooks/outgoing/anything?id=${id}`);
  const req = new Request(url.toString(), { method, body: body ? JSON.stringify(body) : undefined });
  (req as any).nextUrl = url;
  return req;
}

describe("PATCH /api/webhooks/outgoing/[id]", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(buildMockDb());
  });

  it("returns 400 when id missing", async () => {
    const { PATCH } = await import("./route");
    const url = new URL("http://localhost/api/webhooks/outgoing/anything");
    const req = new Request(url.toString(), { method: "PATCH", body: JSON.stringify({ url: "https://new.com" }) });
    (req as any).nextUrl = url;

    const res = await PATCH(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Webhook ID required");
  });

  it("returns 404 when webhook not found", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(buildMockDb(false));

    const { PATCH } = await import("./route");
    const req = makeReq("PATCH", "wh1", { url: "https://new.com" });

    const res = await PATCH(req as any);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Webhook not found");
  });

  it("updates and returns success", async () => {
    const { PATCH } = await import("./route");
    const req = makeReq("PATCH", "wh1", { url: "https://new.com" });

    const res = await PATCH(req as any);
    const json = await res.json();

    expect(json.id).toBe("wh1");
    expect(json.url).toBe("https://new.com");
    expect(json.updatedAt).toBeDefined();
  });
});

describe("DELETE /api/webhooks/outgoing/[id]", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(buildMockDb());
  });

  it("returns 400 when id missing", async () => {
    const { DELETE } = await import("./route");
    const url = new URL("http://localhost/api/webhooks/outgoing/anything");
    const req = new Request(url.toString(), { method: "DELETE" });
    (req as any).nextUrl = url;

    const res = await DELETE(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Webhook ID required");
  });

  it("returns 404 when webhook not found", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(buildMockDb(false));

    const { DELETE } = await import("./route");
    const req = makeReq("DELETE", "wh1");

    const res = await DELETE(req as any);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Webhook not found");
  });

  it("removes and returns success", async () => {
    const { DELETE } = await import("./route");
    const req = makeReq("DELETE", "wh1");

    const res = await DELETE(req as any);
    const json = await res.json();

    expect(json.deleted).toBe(true);
  });
});
