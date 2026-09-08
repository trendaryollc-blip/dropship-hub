import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/validation", () => ({
  GenerateCreativeInputSchema: {},
  validateBody: vi.fn((schema: any, body: any) => ({ success: true, data: body })),
}));

vi.mock("@/lib/ad-creatives/generator", () => ({
  generateCreatives: vi.fn().mockResolvedValue({
    creatives: [{ type: "headline", content: "Great Product" }],
    provider: "openai",
  }),
}));

vi.mock("@/lib/data/ad-creatives", () => ({
  addAdCreative: vi.fn().mockResolvedValue("creative-1"),
}));

describe("/api/ad-creatives/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates and saves creatives", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ad-creatives/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "facebook",
        productTitle: "Widget",
        productDescription: "A great widget",
        targetAudience: "adults",
        tone: "professional",
        types: ["headline"],
        count: 1,
      }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/ad-creatives/generate");
    const response = await POST(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.provider).toBe("openai");
    expect(data.creatives).toHaveLength(1);
    expect(data.savedIds).toContain("creative-1");
  });

  it("returns validation error when body invalid", async () => {
    const { validateBody } = await import("@/lib/validation");
    (validateBody as any).mockReturnValueOnce({
      success: false,
      response: new Response(JSON.stringify({ error: "Invalid" }), { status: 400 }),
    });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ad-creatives/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    (request as any).nextUrl = new URL("http://localhost/api/ad-creatives/generate");
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });
});
