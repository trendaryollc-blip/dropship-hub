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

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
}

function buildQueryChain(docs: any[]) {
  return {
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}

describe("GET /api/suppliers/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns reviews and community score", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                docs: [
                  { id: "r1", data: () => ({ supplierId: "sup1", overallRating: 4, breakdown: { productQuality: 4, shippingSpeed: 3, communication: 5, pricing: 4, reliability: 4 }, title: "Great", body: "Good supplier", verified: true, helpful: 5 }) },
                ],
              }),
            }),
          }),
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ supplierId: "sup1", totalReviews: 10, avgRating: 4.2 }),
          }),
        }),
      }),
    });

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/reviews?supplierId=sup1");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.reviews).toBeDefined();
    expect(json.communityScore).toBeDefined();
  });

  it("returns 400 when supplierId is missing", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/reviews");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.error).toContain("required");
  });
});

describe("POST /api/suppliers/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a review", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    const setMock = vi.fn().mockResolvedValue(undefined);
    const innerDocMock = vi.fn().mockReturnValue({ id: "new-review", set: setMock });
    const docRefMock = vi.fn().mockReturnValue({ collection: vi.fn().mockReturnValue({ doc: innerDocMock }) });
    const colRefMock = vi.fn().mockReturnValue({ doc: docRefMock });
    (getAdminDB as any).mockResolvedValue({
      collection: colRefMock,
    });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/reviews", {
      method: "POST",
      body: JSON.stringify({
        supplierId: "sup1",
        overallRating: 5,
        title: "Excellent",
        body: "Amazing supplier",
        breakdown: { productQuality: 5, shippingSpeed: 4, communication: 5, pricing: 4, reliability: 5 },
      }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.review).toBeDefined();
    expect(json.review.supplierId).toBe("sup1");
  });

  it("returns 400 for missing fields", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/reviews", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.error).toContain("Missing");
  });
});
