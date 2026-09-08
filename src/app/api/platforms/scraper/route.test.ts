import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/validation", () => ({
  validateBody: vi.fn(),
  ScraperSchema: {},
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Scraper API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SCRAPER_API_KEY = "test-scraper-key";
    delete process.env.ZENROWS_API_KEY;
  });

  it("GET returns platform info and supported platforms", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/scraper" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("Scraper-Based Platforms");
    expect(body.configured).toBe(true);
    expect(body.supported).toContain("walmart");
    expect(body.supported).toContain("temu");
  });

  it("POST returns 400 for invalid platform", async () => {
    const { validateBody } = await import("@/lib/validation");
    vi.mocked(validateBody).mockReturnValue({ success: true, data: { query: "test", platform: "invalid" } });
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test", platform: "invalid" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST returns 503 when no scraper configured", async () => {
    delete process.env.SCRAPER_API_KEY;
    delete process.env.ZENROWS_API_KEY;
    const { validateBody } = await import("@/lib/validation");
    vi.mocked(validateBody).mockReturnValue({ success: true, data: { query: "test", platform: "walmart" } });
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test", platform: "walmart" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("POST returns validation error on invalid body", async () => {
    const { validateBody } = await import("@/lib/validation");
    vi.mocked(validateBody).mockReturnValue({
      success: false,
      response: Response.json({ error: "Invalid input" }, { status: 400 }),
    });
    const { POST } = await import("./route");
    const req = { json: async () => ({}) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
