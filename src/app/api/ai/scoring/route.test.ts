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

const mockCollectionFn = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({
    collection: mockCollectionFn,
  }),
}));

function mockFirestoreEmpty() {
  mockCollectionFn.mockReturnValue({
    doc: vi.fn().mockReturnValue({
      collection: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ docs: [] }),
          }),
        }),
        get: vi.fn().mockResolvedValue({ docs: [] }),
      }),
    }),
  });
}

describe("/api/ai/scoring", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFirestoreEmpty();
  });

  it("POST returns 400 when products array is missing", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("products");
  });

  it("POST scores custom products successfully", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        products: [
          {
            id: "prod-1",
            title: "Wireless Headphones",
            price: 49.99,
            margin: 45,
            priceHistory: [39.99, 44.99, 49.99],
            sellerCount: 8,
            priceSpread: 0.35,
            supplierReliability: 92,
            shippingDays: 7,
          },
        ],
      }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.products).toBeDefined();
    expect(data.products.length).toBe(1);
    expect(data.products[0].productId).toBe("prod-1");
    expect(data.products[0].overallScore).toBeGreaterThan(0);
    expect(data.products[0].grade).toBeDefined();
    expect(data.products[0].reasoning).toBeInstanceOf(Array);
  });

  it("POST returns 400 when products is not an array", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: "not-an-array" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST scores multiple products sorted by overallScore", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        products: [
          { id: "low", title: "Low Score", price: 10, margin: 5, priceHistory: [10], sellerCount: 60, priceSpread: 0.1, supplierReliability: 50, shippingDays: 30 },
          { id: "high", title: "High Score", price: 50, margin: 65, priceHistory: [30, 40, 50], sellerCount: 3, priceSpread: 0.6, supplierReliability: 98, shippingDays: 3 },
        ],
      }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.products[0].overallScore).toBeGreaterThanOrEqual(data.products[1].overallScore);
  });

  it("GET returns auto-scored products from Firestore", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/ai/scoring");
    const response = await GET(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.products).toBeDefined();
    expect(Array.isArray(data.products)).toBe(true);
  });

  it("GET returns message when no products to score", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/ai/scoring");
    const response = await GET(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.message).toBeDefined();
  });

  it("GET returns 500 on Firestore error", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockRejectedValue(new Error("DB error"));

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/ai/scoring");
    const response = await GET(request as any);
    expect(response.status).toBe(500);
  });
});
