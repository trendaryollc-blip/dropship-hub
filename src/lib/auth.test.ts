import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => {
  class NR {
    status: number;
    body: unknown;
    constructor(body?: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status || 200;
    }
    static json(body: unknown, init?: { status?: number }) {
      return new NR(body, init);
    }
  }
  return { NextRequest: vi.fn(), NextResponse: NR };
});

vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByUser: vi.fn(() => ({ allowed: true, response: null })),
  LIMITS: {
    DEFAULT: { windowMs: 60000, maxRequests: 60 },
    AUTH: { windowMs: 60000, maxRequests: 30 },
  },
}));

import { verifyAuth, requireAuth, withAuth, requireOwner, isOwner } from "./auth";
import { getAdminAuth } from "@/lib/firebase-admin";
import { rateLimitByUser } from "@/lib/rate-limit";

function makeReq(header: string | null) {
  return { headers: { get: () => header } } as any;
}

describe("verifyAuth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OWNER_UID = "owner-uid-123";
    process.env.OWNER_EMAIL = "owner@test.com";
    process.env.CHECK_TOKEN_REVOCATION = "false";
  });

  it("returns null for missing Authorization header", async () => {
    expect(await verifyAuth(makeReq(null))).toBeNull();
  });

  it("returns null for non-Bearer token", async () => {
    expect(await verifyAuth(makeReq("Basic abc123"))).toBeNull();
  });

  it("returns null for empty header", async () => {
    expect(await verifyAuth(makeReq(""))).toBeNull();
  });

  it("returns null for Bearer with empty token", async () => {
    expect(await verifyAuth(makeReq("Bearer "))).toBeNull();
  });

  it("returns uid on valid token", async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "user-123" }),
    } as any);
    expect(await verifyAuth(makeReq("Bearer valid-token"))).toBe("user-123");
  });

  it("passes checkRevocation=true when env is set", async () => {
    process.env.CHECK_TOKEN_REVOCATION = "true";
    const verifyIdToken = vi.fn().mockResolvedValue({ uid: "u" });
    vi.mocked(getAdminAuth).mockReturnValue({ verifyIdToken } as any);
    await verifyAuth(makeReq("Bearer tok"));
    expect(verifyIdToken).toHaveBeenCalledWith("tok", true);
  });

  it("returns null when verifyIdToken throws", async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockRejectedValue(new Error("bad")),
    } as any);
    expect(await verifyAuth(makeReq("Bearer bad"))).toBeNull();
  });
});

describe("requireAuth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OWNER_UID = "owner-uid-123";
  });

  it("returns 401 for unauthenticated", async () => {
    const r = await requireAuth(makeReq(null));
    expect((r as any).status).toBe(401);
  });

  it("returns {uid} for valid token", async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "valid" }),
    } as any);
    const r = await requireAuth(makeReq("Bearer tok"));
    expect(r).toEqual({ uid: "valid" });
  });
});

describe("withAuth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OWNER_UID = "owner-uid-123";
  });

  it("calls handler with uid when authenticated", async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "auth-user" }),
    } as any);
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    const wrapped = withAuth(handler);
    const r = await wrapped(makeReq("Bearer tok"));
    expect(handler).toHaveBeenCalledWith(expect.anything(), "auth-user");
    expect(r).toBeInstanceOf(Response);
  });

  it("returns 401 when not authenticated", async () => {
    const handler = vi.fn();
    const r = await withAuth(handler)(makeReq(null));
    expect(handler).not.toHaveBeenCalled();
    expect((r as any).status).toBe(401);
  });

  it("returns rate-limit response when rate limited", async () => {
    vi.mocked(rateLimitByUser).mockReturnValue({
      allowed: false,
      response: { status: 429, json: () => Promise.resolve({ error: "Too many" }) },
    } as any);
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "u" }),
    } as any);
    const handler = vi.fn();
    const r = await withAuth(handler)(makeReq("Bearer tok"));
    expect(handler).not.toHaveBeenCalled();
    expect((r as any).status).toBe(429);
  });
});

describe("requireOwner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OWNER_UID = "owner-uid-123";
    process.env.OWNER_EMAIL = "owner@test.com";
  });

  it("returns 401 for unauthenticated", async () => {
    const r = await requireOwner(vi.fn())(makeReq(null));
    expect((r as any).status).toBe(401);
  });

  it("returns 403 for non-owner", async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "regular" }),
      getUser: vi.fn().mockResolvedValue({ email: "regular@test.com" }),
    } as any);
    const r = await requireOwner(vi.fn())(makeReq("Bearer tok"));
    expect((r as any).status).toBe(403);
  });

  it("calls handler for owner matched by UID", async () => {
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "owner-uid-123" }),
      getUser: vi.fn(),
    } as any);
    const handler = vi.fn().mockResolvedValue(new Response("ok"));
    await requireOwner(handler)(makeReq("Bearer tok"));
    expect(handler).toHaveBeenCalledWith(expect.anything(), "owner-uid-123");
  });

  it("returns 403 when owner check is rate limited", async () => {
    vi.mocked(rateLimitByUser).mockReturnValue({
      allowed: false,
      response: { status: 429 } as any,
    } as any);
    vi.mocked(getAdminAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: "u" }),
      getUser: vi.fn().mockResolvedValue({ email: "u@test.com" }),
    } as any);
    const r = await requireOwner(vi.fn())(makeReq("Bearer tok"));
    expect((r as any).status).toBe(429);
  });
});

describe("isOwner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OWNER_UID = "owner-uid-123";
    process.env.OWNER_EMAIL = "owner@test.com";
  });

  it("returns false for empty UID", async () => {
    expect(await isOwner("")).toBe(false);
  });

  it("returns true for matching OWNER_UID", async () => {
    expect(await isOwner("owner-uid-123")).toBe(true);
  });

  it("returns false for non-owner UID", async () => {
    expect(await isOwner("random-user-123")).toBe(false);
  });

  it("returns false when OWNER_UID is not set", async () => {
    delete process.env.OWNER_UID;
    expect(await isOwner("owner-uid-123")).toBe(false);
  });

  it("returns false when getUserByEmail fails", async () => {
    process.env.OWNER_UID = "";
    vi.mocked(getAdminAuth).mockReturnValue({
      getUserByEmail: vi.fn().mockRejectedValue(new Error("nf")),
      getUser: vi.fn().mockResolvedValue({ email: "other@test.com" }),
    } as any);
    expect(await isOwner("some-uid")).toBe(false);
  });

  it("falls back to hardcoded email check", async () => {
    process.env.OWNER_UID = "";
    process.env.OWNER_EMAIL = "";
    vi.mocked(getAdminAuth).mockReturnValue({
      getUserByEmail: vi.fn(),
      getUser: vi.fn().mockResolvedValue({ email: "trendaryo206@gmail.com" }),
    } as any);
    expect(await isOwner("fallback-uid")).toBe(true);
  });

  it("returns false when getUser throws in fallback", async () => {
    process.env.OWNER_UID = "";
    process.env.OWNER_EMAIL = "";
    vi.mocked(getAdminAuth).mockReturnValue({
      getUserByEmail: vi.fn(),
      getUser: vi.fn().mockRejectedValue(new Error("nf")),
    } as any);
    expect(await isOwner("unknown-uid")).toBe(false);
  });

  it("returns false when user has no email", async () => {
    process.env.OWNER_UID = "";
    process.env.OWNER_EMAIL = "";
    vi.mocked(getAdminAuth).mockReturnValue({
      getUserByEmail: vi.fn(),
      getUser: vi.fn().mockResolvedValue({ email: null }),
    } as any);
    expect(await isOwner("no-email")).toBe(false);
  });

  it("normalizes UIDs to lowercase", async () => {
    process.env.OWNER_UID = "OWNER-UID-123";
    expect(await isOwner("owner-uid-123")).toBe(true);
  });
});
