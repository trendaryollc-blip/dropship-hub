import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/search/intent-parser", () => ({
  parseIntentLocally: vi.fn((q: string) => ({
    keywords: q.split(" "),
    originalQuery: q,
    confidence: 0.5,
  })),
  parseIntentWithAI: vi.fn(async (q: string) => ({
    keywords: q.split(" "),
    priceMax: 20,
    originalQuery: q,
    confidence: 0.9,
  })),
}));

function makeRequest(body: unknown) {
  return {
    json: async () => body,
    url: "http://localhost/api/search/parse-intent",
  } as any;
}

describe("POST /api/search/parse-intent", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
  });

  it("returns 200 with parsed intent for valid query", async () => {
    const req = makeRequest({ query: "wireless earbuds under $20" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.intent).toBeDefined();
    expect(data.intent.keywords).toBeDefined();
    expect(data.intent.originalQuery).toBe("wireless earbuds under $20");
  });

  it("returns 400 for missing query field", async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty query", async () => {
    const req = makeRequest({ query: "" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-string query", async () => {
    const req = makeRequest({ query: 123 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("uses local parser when no API key", async () => {
    const req = makeRequest({ query: "wireless earbuds" });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.intent).toBeDefined();
  });

  it("handles malformed request body gracefully", async () => {
    const badReq = { json: async () => { throw new Error("bad json"); }, url: "" } as any;
    const res = await POST(badReq);
    expect(res.status).toBe(500);
  });
});
