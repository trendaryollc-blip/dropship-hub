import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

const mockAddReviews = vi.fn();
const mockAddImportJob = vi.fn();
const mockGetReviews = vi.fn();
const mockDeleteReview = vi.fn();
const mockGetImportJobs = vi.fn();
const mockGetReviewStats = vi.fn();

vi.mock("@/lib/data/reviews", () => ({
  addReviews: (...args: unknown[]) => mockAddReviews(...args),
  addImportJob: (...args: unknown[]) => mockAddImportJob(...args),
  getReviews: (...args: unknown[]) => mockGetReviews(...args),
  deleteReview: (...args: unknown[]) => mockDeleteReview(...args),
  getImportJobs: (...args: unknown[]) => mockGetImportJobs(...args),
  getReviewStats: (...args: unknown[]) => mockGetReviewStats(...args),
}));

function post(body: unknown) {
  return new Request("http://localhost/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddReviews.mockResolvedValue([]);
    mockAddImportJob.mockResolvedValue("job-1");
    mockGetReviews.mockResolvedValue([]);
    mockDeleteReview.mockResolvedValue(true);
    mockGetImportJobs.mockResolvedValue([]);
    mockGetReviewStats.mockResolvedValue({
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      sourceBreakdown: { aliexpress: 0, cj: 0, amazon: 0, ebay: 0, manual: 0, csv: 0 },
      syncStats: { synced: 0, pending: 0, failed: 0 },
      withImages: 0,
      verifiedCount: 0,
      recentImports: 0,
    });
  });

  it("POST import returns 501 and writes nothing when no review source is connected", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      post({ action: "import", productTitle: "Earbuds", productUrl: "https://aliexpress.com/item/1", source: "aliexpress", maxReviews: 10 }) as any
    );
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.error).toMatch(/supplier review source/);
    expect(body.error).toMatch(/not connected yet/);
    expect(mockAddReviews).not.toHaveBeenCalled();
    expect(mockAddImportJob).not.toHaveBeenCalled();
  });

  it("POST import returns 400 without required fields", async () => {
    const { POST } = await import("./route");
    const response = await POST(post({ action: "import", source: "aliexpress" }) as any);
    expect(response.status).toBe(400);
    expect(mockAddReviews).not.toHaveBeenCalled();
  });

  it("POST respond returns a reply template without writing data", async () => {
    const { POST } = await import("./route");
    const review = {
      id: "r1",
      productId: "p1",
      productTitle: "Earbuds",
      source: "aliexpress",
      author: "John D.",
      rating: 5,
      content: "Great",
      images: [],
      verified: false,
      helpful: 0,
      syncStatus: "pending",
      createdAt: "2026-09-20T00:00:00Z",
    };
    const response = await POST(post({ action: "respond", reviewId: "r1", review }) as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.template).toBe(true);
    expect(body.response).toContain("John D.");
    expect(mockAddReviews).not.toHaveBeenCalled();
    expect(mockAddImportJob).not.toHaveBeenCalled();
  });

  it("POST returns 400 for invalid action", async () => {
    const { POST } = await import("./route");
    const response = await POST(post({ action: "nope" }) as any);
    expect(response.status).toBe(400);
  });

  it("GET returns stats from the user's Firestore", async () => {
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/reviews?type=stats") as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.stats.totalReviews).toBe(0);
    expect(mockGetReviewStats).toHaveBeenCalledWith("test-user-123");
  });

  it("GET returns import jobs from the user's Firestore", async () => {
    mockGetImportJobs.mockResolvedValue([{ id: "j1", productTitle: "Earbuds", status: "completed" }]);
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/reviews?type=jobs") as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.jobs).toHaveLength(1);
    expect(mockGetImportJobs).toHaveBeenCalledWith("test-user-123");
  });

  it("GET returns the reviews list", async () => {
    mockGetReviews.mockResolvedValue([{ id: "r1", source: "aliexpress" }]);
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/reviews?type=list") as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reviews).toHaveLength(1);
  });

  it("DELETE removes a review", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost/api/reviews?id=r1") as any);
    expect(response.status).toBe(200);
    expect(mockDeleteReview).toHaveBeenCalledWith("test-user-123", "r1");
  });

  it("DELETE returns 400 without an id", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost/api/reviews") as any);
    expect(response.status).toBe(400);
  });
});
