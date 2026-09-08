import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AI: { windowMs: 60000, maxRequests: 30 }, AI_CHAT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockGetListings = vi.fn();
const mockDeleteListing = vi.fn();
const mockGetListingStats = vi.fn();

vi.mock("@/lib/data/product-listings", () => ({
  getListings: mockGetListings,
  deleteListing: mockDeleteListing,
  getListingStats: mockGetListingStats,
}));

describe("GET /api/ai/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns listings by default", async () => {
    mockGetListings.mockResolvedValue([
      { id: "l1", title: "Product A", platform: "Shopify", status: "live" },
    ]);

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/listings");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.listings).toHaveLength(1);
    expect(body.listings[0].title).toBe("Product A");
  });

  it("returns stats when type=stats", async () => {
    mockGetListingStats.mockResolvedValue({ total: 10, live: 7, error: 2 });

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/listings?type=stats");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.stats.total).toBe(10);
    expect(body.stats.live).toBe(7);
  });

  it("filters by platform", async () => {
    mockGetListings.mockResolvedValue([]);

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/listings?platform=Shopify");
    const res = await GET(req as any);

    expect(mockGetListings).toHaveBeenCalledWith("test-user-123", "Shopify");
  });

  it("returns error on failure", async () => {
    mockGetListings.mockRejectedValue(new Error("DB error"));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/listings");
    const res = await GET(req as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Failed to fetch");
  });
});

describe("DELETE /api/ai/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a listing", async () => {
    mockDeleteListing.mockResolvedValue(true);

    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/ai/listings?id=listing-1", { method: "DELETE" });
    const res = await DELETE(req as any);
    const body = await res.json();

    expect(body.success).toBe(true);
  });

  it("returns 400 when id missing", async () => {
    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/ai/listings", { method: "DELETE" });
    const res = await DELETE(req as any);
    const body = await res.json();

    expect(body.error).toContain("Missing");
  });

  it("returns 500 when deletion fails", async () => {
    mockDeleteListing.mockResolvedValue(false);

    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/ai/listings?id=listing-1", { method: "DELETE" });
    const res = await DELETE(req as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Failed to delete");
  });
});
