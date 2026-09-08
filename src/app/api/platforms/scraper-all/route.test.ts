import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Scraper-All API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SCRAPER_API_KEY = "test-scraper-key";
    delete process.env.ZENROWS_API_KEY;
  });

  it("GET returns platform info and supported list", async () => {
    const { GET } = await import("./route");
    const req = { url: "http://localhost/api/platforms/scraper-all" } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(body.platform).toBe("Scraper Platforms");
    expect(body.configured).toBe(true);
    expect(body.supported).toContain("temu");
    expect(body.supported).toContain("shein");
  });

  it("POST returns 400 when query is missing", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({}) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("Query is required");
  });

  it("POST returns 400 for invalid platform", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test", platform: "nonexistent" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid platform");
  });

  it("POST returns 503 when no scraper configured", async () => {
    delete process.env.SCRAPER_API_KEY;
    delete process.env.ZENROWS_API_KEY;
    const { POST } = await import("./route");
    const req = { json: async () => ({ query: "test", platform: "temu" }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(503);
  });
});
