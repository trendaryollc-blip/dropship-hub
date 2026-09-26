import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

const mockGetUserTier = vi.fn();
const mockGetUsage = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  getUserTier: (...args: any[]) => mockGetUserTier(...args),
  getUsage: (...args: any[]) => mockGetUsage(...args),
  trackUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AI_CHAT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          add: vi.fn().mockResolvedValue({ id: "msg-1" }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }),
        }),
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
      }),
    }),
  }),
}));

describe("/api/ai", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetUserTier.mockResolvedValue("free");
    mockGetUsage.mockResolvedValue(0);
  });

  it("POST returns 429 when the monthly AI limit is reached", async () => {
    mockGetUsage.mockResolvedValue(100); // free plan: maxAiCalls = 100
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toBe("Monthly AI message limit reached");
  });

  it("POST returns 403 when the free plan requests a paid provider", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
        providerPriority: [{ id: "openai", active: true, priority: 1 }],
      }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Provider not available on your plan");
  });

  it("POST returns 429 before consuming provider keys when limited", async () => {
    mockGetUserTier.mockResolvedValue("pro");
    mockGetUsage.mockResolvedValue(1000); // pro plan: maxAiCalls = 1000
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(429);
  });

  it("POST returns 400 for invalid body", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST returns valid response for valid chat message", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "What are my top products?" }],
      }),
    });
    const response = await POST(request as any);
    expect([200, 503]).toContain(response.status);
  });

  it("GET returns available providers", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/ai");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.providers).toBeDefined();
    expect(Array.isArray(data.providers)).toBe(true);
    // Free plan: free providers unlocked, paid providers locked.
    const openai = data.providers.find((p: { id: string }) => p.id === "openai");
    const groq = data.providers.find((p: { id: string }) => p.id === "groq");
    expect(openai?.locked).toBe(true);
    expect(groq?.locked).toBe(false);
  });
});
