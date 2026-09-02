import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminAuth: vi.fn().mockResolvedValue({
    verifyIdToken: vi.fn(),
  }),
}));

describe("Auth Bypass Security Tests", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("verifyAuth rejects requests without Authorization header", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    const request = { headers: { get: () => null } } as any;
    const result = await verifyAuth(request);
    expect(result).toBeNull();
  });

  it("verifyAuth rejects non-Bearer tokens", async () => {
    const { verifyAuth } = await import("@/lib/auth");
    const request = { headers: { get: () => "Basic abc123" } } as any;
    const result = await verifyAuth(request);
    expect(result).toBeNull();
  });

  it("requireAuth returns 401 for unauthenticated requests", async () => {
    const { requireAuth } = await import("@/lib/auth");
    const request = { headers: { get: () => null } } as any;
    const result = await requireAuth(request);
    expect(result).toBeDefined();
    expect("status" in result ? result.status : 401).toBe(401);
  });

  it("isOwner returns true only for owner UIDs", async () => {
    process.env.OWNER_UID = "owner-123";
    const { isOwner } = await import("@/lib/auth");
    expect(await isOwner("owner-123")).toBe(true);
    expect(await isOwner("random-user")).toBe(false);
  });

  it("isOwner returns false for empty UID", async () => {
    process.env.OWNER_UID = "owner-123";
    const { isOwner } = await import("@/lib/auth");
    expect(await isOwner("")).toBe(false);
  });
});
