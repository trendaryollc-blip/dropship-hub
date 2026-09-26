import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfigMissingError } from "@/lib/api-keys/pool";

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

const mockFetchAmazon = vi.fn();
vi.mock("@/lib/reviews/import-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/reviews/import-service")>();
  return {
    ...actual,
    fetchAmazonReviewRows: (...args: unknown[]) => mockFetchAmazon(...args),
  };
});

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
    mockFetchAmazon.mockReset();
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

  it("POST import of CSV saves real rows and records a completed job", async () => {
    const { POST } = await import("./route");
    const csv = [
      "rating,author,content",
      '5,Jane D.,"Great quality"',
      '4,Bob,"Pretty good"',
      "9,Broken,Rating out of range",
    ].join("\n");
    const response = await POST(
      post({ action: "import", productTitle: "Earbuds", productUrl: "", source: "csv", maxReviews: 10, csv }) as any
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.imported).toBe(2);
    expect(body.skipped).toBe(1);
    expect(body.jobId).toBe("job-1");

    expect(mockAddReviews).toHaveBeenCalledTimes(1);
    const docs = mockAddReviews.mock.calls[0][1];
    expect(docs).toHaveLength(2);
    expect(docs[0]).toMatchObject({
      productId: "",
      productTitle: "Earbuds",
      source: "csv",
      author: "Jane D.",
      rating: 5,
      content: "Great quality",
      syncStatus: "pending",
    });

    expect(mockAddImportJob).toHaveBeenCalledTimes(1);
    const job = mockAddImportJob.mock.calls[0][1];
    expect(job).toMatchObject({
      productTitle: "Earbuds",
      source: "csv",
      status: "completed",
      totalFound: 3,
      imported: 2,
      skipped: 1,
      failed: 0,
    });
    expect(job.completedAt).toBeTruthy();
  });

  it("POST import without a CSV file returns 400 and writes nothing", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      post({ action: "import", productTitle: "Earbuds", source: "csv", maxReviews: 10 }) as any
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Attach a CSV file/);
    expect(mockAddReviews).not.toHaveBeenCalled();
    expect(mockAddImportJob).not.toHaveBeenCalled();
  });

  it("POST import with CSV rows that have no valid ratings returns 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      post({ action: "import", productTitle: "Earbuds", source: "csv", maxReviews: 10, csv: "rating,content\n9,nope" }) as any
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/No valid review rows/);
    expect(mockAddReviews).not.toHaveBeenCalled();
  });

  it("POST import from unconnected sources returns an honest 501 and writes nothing", async () => {
    const { POST } = await import("./route");
    for (const source of ["aliexpress", "cj", "ebay"]) {
      const response = await POST(
        post({ action: "import", productTitle: "Earbuds", productUrl: "https://x.com/1", source, maxReviews: 10 }) as any
      );
      expect(response.status).toBe(501);
      const body = await response.json();
      expect(body.error).toMatch(/not connected yet/);
      expect(body.error).toMatch(/nothing was imported/);
    }
    expect(mockAddReviews).not.toHaveBeenCalled();
    expect(mockAddImportJob).not.toHaveBeenCalled();
    expect(mockFetchAmazon).not.toHaveBeenCalled();
  });

  it("POST import from Amazon without a product URL returns 400 (no ASIN)", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      post({ action: "import", productTitle: "Earbuds", productUrl: "https://aliexpress.com/item/1", source: "amazon", maxReviews: 10 }) as any
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/ASIN/);
    expect(mockFetchAmazon).not.toHaveBeenCalled();
    expect(mockAddReviews).not.toHaveBeenCalled();
  });

  it("POST import from Amazon returns 501 when Rainforest is not configured", async () => {
    mockFetchAmazon.mockRejectedValue(new ConfigMissingError("rainforest"));
    const { POST } = await import("./route");
    const response = await POST(
      post({ action: "import", productTitle: "Earbuds", productUrl: "https://www.amazon.com/dp/B0ABC12345", source: "amazon", maxReviews: 10 }) as any
    );
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.error).toMatch(/Rainforest API is not configured/);
    expect(mockAddReviews).not.toHaveBeenCalled();
    expect(mockAddImportJob).not.toHaveBeenCalled();
  });

  it("POST import from Amazon saves fetched rows and records a completed job", async () => {
    mockFetchAmazon.mockResolvedValue({
      rows: [
        { author: "Sam", rating: 5, title: "Solid", content: "Works well", images: [], verified: true, sourceReviewId: "R1" },
        { author: "Amy", rating: 4, title: "", content: "Nice", images: [], verified: false },
      ],
      totalFound: 1234,
    });
    const { POST } = await import("./route");
    const response = await POST(
      post({ action: "import", productTitle: "Earbuds", productUrl: "https://www.amazon.com/dp/B0ABC12345", source: "amazon", maxReviews: 10 }) as any
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.imported).toBe(2);
    expect(body.totalFound).toBe(1234);
    expect(mockFetchAmazon).toHaveBeenCalledWith("B0ABC12345", 10);
    expect(mockAddReviews).toHaveBeenCalledTimes(1);
    const docs = mockAddReviews.mock.calls[0][1];
    expect(docs[0]).toMatchObject({ source: "amazon", author: "Sam", syncStatus: "pending" });
    expect(mockAddImportJob.mock.calls[0][1]).toMatchObject({
      source: "amazon",
      status: "completed",
      imported: 2,
      totalFound: 1234,
    });
  });

  it("POST import maps a Rainforest auth failure to an honest 501", async () => {
    const authError = Object.assign(new Error("Rainforest API rejected the key (HTTP 401)"), { status: 401 });
    mockFetchAmazon.mockRejectedValue(authError);
    const { POST } = await import("./route");
    const response = await POST(
      post({ action: "import", productTitle: "Earbuds", productUrl: "https://www.amazon.com/dp/B0ABC12345", source: "amazon", maxReviews: 10 }) as any
    );
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.error).toMatch(/rejected the API key/);
    expect(mockAddReviews).not.toHaveBeenCalled();
  });

  it("POST import returns 400 without required fields", async () => {
    const { POST } = await import("./route");
    const response = await POST(post({ action: "import", source: "aliexpress" }) as any);
    expect(response.status).toBe(400);
    expect(mockAddReviews).not.toHaveBeenCalled();
  });

  it("POST import returns 400 when maxReviews is out of range", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      post({ action: "import", productTitle: "Earbuds", source: "csv", maxReviews: 500, csv: "rating,content\n5,ok" }) as any
    );
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
