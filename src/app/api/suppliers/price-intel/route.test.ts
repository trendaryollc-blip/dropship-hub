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

const mockGetPriceIntelligence = vi.fn();
const mockSavePriceIntelligence = vi.fn();
const mockIsPriceIntelligenceFresh = vi.fn();
const mockGetSuppliers = vi.fn();

vi.mock("@/lib/data/price-intelligence", () => ({
  getPriceIntelligence: (...args: any[]) => mockGetPriceIntelligence(...args),
  savePriceIntelligence: (...args: any[]) => mockSavePriceIntelligence(...args),
  isPriceIntelligenceFresh: (...args: any[]) => mockIsPriceIntelligenceFresh(...args),
}));

vi.mock("@/lib/supplier-service", () => ({
  getSuppliers: (...args: any[]) => mockGetSuppliers(...args),
}));

const mockSuppliers = [
  {
    id: "supplier-a", name: "Supplier A", slug: "supplier-a", location: "China", country: "CN", flag: "\ud83c\udde8\ud83c\uddf3",
    description: "Good supplier", specializations: ["Electronics"], trustBadge: "gold", dataSource: "live",
    stats: { reliabilityScore: 95, rating: 4.8, reviews: 500, responseTime: "2h", responseTimeHours: 2,
      shippingDays: 5, shippingDaysEU: 7, orderCompletionRate: 99, disputeRate: 0.2, monthlyOrders: 5000,
      totalProducts: 1000, yearEstablished: 2015, communicationScore: 90, qualityScore: 92, priceCompetitiveness: 88 },
    shipping: { methods: [], processingTime: "1-3 days", freeShippingThreshold: 50, packagingQuality: "premium" },
    quality: { inspection: "", returnPolicy: "", refundPolicy: "", replacementPolicy: "", disputeResolution: "", certifications: [] },
    catalog: { categories: ["Electronics"], priceRange: { min: 5, max: 20 }, moq: 5, samplesAvailable: true, samplePrice: 3 },
    communication: { methods: [], languages: [], supportHours: "" },
    source: "cj" as const, sourceUrl: null, lastUpdated: new Date().toISOString(),
  },
  {
    id: "supplier-b", name: "Supplier B", slug: "supplier-b", location: "USA", country: "US", flag: "\ud83c\uddfa\ud83c\uddf8",
    description: "Fast supplier", specializations: ["Fashion"], trustBadge: "silver", dataSource: "live",
    stats: { reliabilityScore: 85, rating: 4.5, reviews: 300, responseTime: "4h", responseTimeHours: 4,
      shippingDays: 3, shippingDaysEU: 5, orderCompletionRate: 97, disputeRate: 1.0, monthlyOrders: 3000,
      totalProducts: 500, yearEstablished: 2018, communicationScore: 80, qualityScore: 85, priceCompetitiveness: 75 },
    shipping: { methods: [], processingTime: "1-2 days", freeShippingThreshold: null, packagingQuality: "standard" },
    quality: { inspection: "", returnPolicy: "", refundPolicy: "", replacementPolicy: "", disputeResolution: "", certifications: [] },
    catalog: { categories: ["Fashion"], priceRange: { min: 8, max: 25 }, moq: 10, samplesAvailable: false, samplePrice: 0 },
    communication: { methods: [], languages: [], supportHours: "" },
    source: "cj" as const, sourceUrl: null, lastUpdated: new Date().toISOString(),
  },
];

describe("/api/suppliers/price-intel", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetSuppliers.mockResolvedValue(mockSuppliers);
    mockGetPriceIntelligence.mockResolvedValue(null);
    mockSavePriceIntelligence.mockResolvedValue(undefined);
    mockIsPriceIntelligenceFresh.mockResolvedValue(false);
  });

  it("GET returns 400 when product parameter is missing", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/price-intel");
    const response = await GET(request as any);
    expect(response.status).toBe(400);
  });

  it("GET returns offers from suppliers", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/price-intel?product=phone+case");
    const response = await GET(request as any);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.result).toBeDefined();
    expect(data.result.offers.length).toBe(2);
    expect(data.cached).toBe(false);
  });

  it("GET returns cached results when fresh", async () => {
    mockIsPriceIntelligenceFresh.mockResolvedValue(true);
    mockGetPriceIntelligence.mockResolvedValue({
      id: "phone-case", productQuery: "phone case", normalizedProductName: "phone case",
      category: "", lastUpdated: new Date().toISOString(), offers: [], bestDeal: "", priceHistory: [],
    });

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/price-intel?product=phone+case");
    const response = await GET(request as any);
    const data = await response.json();
    expect(data.cached).toBe(true);
  });

  it("GET sorts offers by score (best value first)", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/price-intel?product=phone+case");
    const response = await GET(request as any);
    const data = await response.json();
    // Supplier A has better reliability and quality, so should rank higher
    expect(data.result.bestDeal).toBe("supplier-a");
  });

  it("GET includes selling price in margin calculation", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/price-intel?product=phone+case&sellingPrice=30");
    const response = await GET(request as any);
    const data = await response.json();
    expect(data.result.offers[0].estimatedMargin).toBeGreaterThan(0);
  });

  it("POST creates price lookup from body", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/price-intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: "wireless mouse", sellingPrice: 25 }),
    });
    const response = await POST(request as any);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.result.productQuery).toBe("wireless mouse");
    expect(data.result.offers.length).toBe(2);
  });

  it("POST returns 400 on invalid input", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/price-intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST returns cached when fresh", async () => {
    mockIsPriceIntelligenceFresh.mockResolvedValue(true);
    mockGetPriceIntelligence.mockResolvedValue({
      id: "phone-case", productQuery: "phone case", normalizedProductName: "phone case",
      category: "", lastUpdated: new Date().toISOString(), offers: [], bestDeal: "", priceHistory: [],
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/price-intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: "phone case" }),
    });
    const response = await POST(request as any);
    const data = await response.json();
    expect(data.cached).toBe(true);
  });

  it("GET saves result to Firestore", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/price-intel?product=phone+case");
    await GET(request as any);
    expect(mockSavePriceIntelligence).toHaveBeenCalled();
  });

  it("GET normalizes product name", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers/price-intel?product=Phone+Case+");
    const response = await GET(request as any);
    const data = await response.json();
    expect(data.result.normalizedProductName).toBe("phone case");
  });
});
