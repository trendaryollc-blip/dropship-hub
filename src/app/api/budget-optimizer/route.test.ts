import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(() => "q"),
  limit: vi.fn(() => "q"),
  where: vi.fn(() => ({ orderBy: vi.fn(() => ({ limit: vi.fn(() => "q") })) })),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(() => "mock-ts"),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("@/lib/data/utils", () => ({
  handleFirestoreError: vi.fn((_ctx: string, err: unknown) => { throw err; }),
}));

describe("/api/budget-optimizer", () => {
  beforeEach(() => { vi.resetModules(); });

  it("GET returns recommendations", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/budget-optimizer");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });
});
