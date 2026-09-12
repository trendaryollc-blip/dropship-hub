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

import { POST } from "./route";

function makeReq(body: any) {
  return { json: async () => body } as any;
}

describe("POST /api/products/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with empty object when no useful data provided", async () => {
    const res = await POST(makeReq({}), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({});
  });

  it("returns fallback review data when rating and count provided", async () => {
    const res = await POST(makeReq({ url: "", source: "unknown", title: "Test", rating: 4.5, reviews: 100 }), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.averageRating).toBe(4.5);
    expect(data.totalReviews).toBe(100);
    expect(data.distribution).toBeDefined();
    expect(data.distribution.length).toBe(5);
    expect(data.trustworthyScore).toBeDefined();
  });

  it("returns fallback when only rating is provided", async () => {
    const res = await POST(makeReq({ source: "other", rating: 3.0, reviews: 0 }), null as any);
    const data = await res.json();
    expect(data.averageRating).toBe(3.0);
    expect(data.reviews).toEqual([]);
  });

  it("includes sentiment analysis structure in fallback", async () => {
    const res = await POST(makeReq({ source: "other", rating: 4.0, reviews: 50 }), null as any);
    const data = await res.json();
    expect(data.sentiment).toBeDefined();
    expect(data.sentiment.positive).toBeDefined();
    expect(data.sentiment.neutral).toBeDefined();
    expect(data.sentiment.negative).toBeDefined();
  });
});
