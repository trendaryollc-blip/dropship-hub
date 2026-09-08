import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/cj-auth", () => ({
  getCJAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

describe("GET /api/niches", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns fallback niches when CJ_API_KEY is not set", async () => {
    const original = process.env.CJ_API_KEY;
    delete process.env.CJ_API_KEY;

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/niches");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.niches).toBeDefined();
    expect(json.niches.length).toBeGreaterThan(0);
    expect(json.isFallback).toBe(true);

    process.env.CJ_API_KEY = original;
  });

  it("returns niches with required fields", async () => {
    const original = process.env.CJ_API_KEY;
    delete process.env.CJ_API_KEY;

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/niches");
    const res = await GET(req as any);
    const json = await res.json();

    const niche = json.niches[0];
    expect(niche).toHaveProperty("id");
    expect(niche).toHaveProperty("name");
    expect(niche).toHaveProperty("overallScore");
    expect(niche).toHaveProperty("grade");

    process.env.CJ_API_KEY = original;
  });

  it("fallback niches have valid grades", async () => {
    const original = process.env.CJ_API_KEY;
    delete process.env.CJ_API_KEY;

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/niches");
    const res = await GET(req as any);
    const json = await res.json();

    const validGrades = ["A+", "A", "B+", "B", "C+", "C"];
    json.niches.forEach((n: any) => {
      expect(validGrades).toContain(n.grade);
    });

    process.env.CJ_API_KEY = original;
  });
});
