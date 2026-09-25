import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/api-keys/pool", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-keys/pool")>();
  return {
    ...actual,
    withKeyPool: vi.fn(async (_provider: string, fn: (key: string) => Promise<unknown>) => fn("test-key")),
  };
});

import { POST } from "./route";

const TREND_VALUES = [30, 40, 50];

function stubSerpFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("engine=google_trends")) {
        return new Response(
          JSON.stringify({
            interest_over_time: {
              timeline_data: TREND_VALUES.map((v) => ({ values: [{ extracted_value: v }] })),
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes("engine=google_shopping")) {
        return new Response(
          JSON.stringify({
            shopping_results: [
              { extracted_price: 20, price: "$20", rating: 4.2 },
              { extracted_price: 30, price: "$30", rating: 4.0 },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({}), { status: 400 });
    })
  );
}

function makeReq(body: any) {
  return { json: async () => body } as any;
}

describe("POST /api/products/market-intel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSerpFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeReq({}), null as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("title");
  });

  it("returns market intel for a valid product", async () => {
    const res = await POST(makeReq({ title: "Wireless Earbuds", price: 29.99, rating: 4.5, reviews: 500 }), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.searchVolume).toBeDefined();
    expect(data.trendDirection).toBeDefined();
    expect(data.competitionLevel).toBeDefined();
    expect(data.riskScore).toBeDefined();
    expect(data.riskFactors).toBeDefined();
    expect(Array.isArray(data.riskFactors)).toBe(true);
  });

  it("reports the Google Trends interest index (0-100) without inventing searches/mo", async () => {
    const res = await POST(makeReq({ title: "Wireless Earbuds", price: 29.99, rating: 4.5, reviews: 500 }), null as any);
    const data = await res.json();

    expect(data.interestIndex).toBe(40);
    expect(data.interestIndex).toBeLessThanOrEqual(100);
    expect(data.searchVolumeNumber).toBeUndefined();
  });

  it("uses defaults when price/rating/reviews not provided", async () => {
    const res = await POST(makeReq({ title: "Generic Item" }), null as any);
    const data = await res.json();
    expect(data.searchVolume).toBeDefined();
    expect(data.trendSparkline).toBeDefined();
    expect(Array.isArray(data.trendSparkline)).toBe(true);
  });

  it("includes canCompete assessment", async () => {
    const res = await POST(makeReq({ title: "Product", price: 50, rating: 4.0, reviews: 200 }), null as any);
    const data = await res.json();
    expect(data.canCompete).toBeDefined();
    expect(typeof data.canCompete).toBe("string");
  });
});
