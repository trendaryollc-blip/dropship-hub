import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AI_CHAT: { windowMs: 60000, maxRequests: 30 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.doMock("@/lib/validation", () => ({
  ListingGenerateSchema: {},
  validateBody: vi.fn((schema: any, body: any) => ({ success: true, data: body })),
}));

vi.doMock("@/lib/listing-generator", () => ({
  generateListing: vi.fn().mockReturnValue({
    listing: {
      platform: "amazon",
      title: "Test",
      description: "Desc",
      bulletPoints: [],
      seoTags: [],
      backendKeywords: [],
      storyDescription: "",
      characterCounts: {},
      optimizationScore: 80,
    },
    alternatives: [],
    keywordSuggestions: [],
    provider: "openai",
  }),
}));

vi.doMock("@/lib/data/product-listings", () => ({
  addListing: vi.fn().mockResolvedValue("listing-1"),
}));

describe("POST /api/ai/listings/generate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates listing and returns result", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/ai/listings/generate", {
      method: "POST",
      body: JSON.stringify({
        product: { title: "Test Product", price: 9.99, images: ["img.jpg"], description: "A test product" },
        platform: "amazon",
        tone: "professional",
      }),
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(json.listing).toBeDefined();
    expect(json.listing.platform).toBe("amazon");
    expect(json.listing.title).toBe("Test");
    expect(json.listing.optimizationScore).toBe(80);
    expect(json.provider).toBe("openai");
    expect(json.generationTime).toBeGreaterThanOrEqual(0);
  });
});
