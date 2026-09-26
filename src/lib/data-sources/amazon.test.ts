import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchAmazonData, convertAmazonToSignal } from "./amazon";
import { __resetPoolStateForTests } from "@/lib/api-keys/pool";

const KEEPA_ENV_VARS = ["KEEPA_API_KEYS", "KEEPA_API_KEY"];

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const KEEPA_PRODUCT = {
  asin: "B0TEST1234",
  title: "Wireless Bluetooth Earbuds",
  rating: 4.4,
  ratingsTotal: 12876,
  stats: { current: [4599, 4799, 1999, 1234, null, null] },
  salesRanks: { "261961011": [1735689600000, 140, 138, -1, 135] },
};

describe("fetchAmazonData (Keepa live adapter)", () => {
  const saved: Record<string, string | undefined> = {};
  const fetchMock = vi.fn();

  beforeEach(() => {
    for (const name of KEEPA_ENV_VARS) saved[name] = process.env[name];
    for (const name of KEEPA_ENV_VARS) delete process.env[name];
    __resetPoolStateForTests();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const name of KEEPA_ENV_VARS) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  it("returns an honest not-configured message when no Keepa key is set", async () => {
    const result = await fetchAmazonData("earbuds");
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/Keepa is not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a real Keepa product to AmazonProductData", async () => {
    process.env.KEEPA_API_KEYS = "keepa_key_1";
    fetchMock.mockResolvedValue(jsonResponse({ products: [KEEPA_PRODUCT] }));

    const result = await fetchAmazonData("wireless earbuds", "30d");
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      keyword: "wireless earbuds",
      asin: "B0TEST1234",
      title: "Wireless Bluetooth Earbuds",
      price: 47.99,
      reviewCount: 12876,
      rating: 4.4,
      bsr: 1234,
      bsrHistory: [
        { date: "2025-01-01", rank: 140 },
        { date: "2025-01-02", rank: 138 },
        { date: "2025-01-04", rank: 135 },
      ],
      sellerCount: 0,
      monthlySales: 0,
    });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("api.keepa.com/search");
    expect(url).toContain("type=product");
    expect(url).toContain("term=wireless+earbuds");
    expect(url).toContain("stats=1");
    expect(url).toContain("history=1");
    expect(url).toContain("rating=1");
    expect(url).toContain("key=keepa_key_1");
  });

  it("falls back to BSR history when stats.current has no sales rank", async () => {
    process.env.KEEPA_API_KEYS = "keepa_key_1";
    fetchMock.mockResolvedValue(
      jsonResponse({
        products: [{ ...KEEPA_PRODUCT, stats: { current: [null, null, null, null] } }],
      })
    );

    const result = await fetchAmazonData("earbuds");
    expect(result.success).toBe(true);
    expect(result.data?.bsr).toBe(135);
    expect(result.data?.price).toBe(0);
  });

  it("returns an honest error when Keepa finds no products", async () => {
    process.env.KEEPA_API_KEYS = "keepa_key_1";
    fetchMock.mockResolvedValue(jsonResponse({ products: [] }));

    const result = await fetchAmazonData("zzz-unfindable");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no Amazon products/);
  });

  it("surfaces Keepa HTTP failures as honest errors", async () => {
    process.env.KEEPA_API_KEYS = "keepa_key_1";
    fetchMock.mockResolvedValue(jsonResponse({ error: "boom" }, 500));

    const result = await fetchAmazonData("earbuds");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Keepa 500/);
  });
});

describe("convertAmazonToSignal", () => {
  it("derives volume from real BSR when monthlySales is unavailable", () => {
    const signal = convertAmazonToSignal(
      {
        keyword: "earbuds",
        asin: "B0TEST1234",
        title: "Earbuds",
        price: 47.99,
        reviewCount: 100,
        rating: 4.4,
        bsr: 1000,
        bsrHistory: [
          { date: "2025-01-01", rank: 1200 },
          { date: "2025-01-02", rank: 1100 },
          { date: "2025-01-03", rank: 1000 },
          { date: "2025-01-04", rank: 900 },
          { date: "2025-01-05", rank: 850 },
          { date: "2025-01-06", rank: 800 },
          { date: "2025-01-07", rank: 750 },
          { date: "2025-01-08", rank: 700 },
        ],
        sellerCount: 0,
        monthlySales: 0,
      },
      "general"
    );
    // Real BSR movement: rank improved → positive velocity, non-zero volume.
    expect(signal.volume).toBeGreaterThan(0);
    expect(signal.velocity).toBeGreaterThan(0);
    expect(signal.growthRate).toBeGreaterThan(0);
  });

  it("returns zeros without BSR history (no invented numbers)", () => {
    const signal = convertAmazonToSignal(
      {
        keyword: "earbuds",
        asin: "B0TEST1234",
        title: "Earbuds",
        price: 0,
        reviewCount: 0,
        rating: 0,
        bsr: 0,
        bsrHistory: [],
        sellerCount: 0,
        monthlySales: 0,
      },
      "general"
    );
    expect(signal).toEqual({
      volume: 0,
      previousVolume: 0,
      growthRate: 0,
      velocity: 0,
      acceleration: 0,
      saturationLevel: 50,
    });
  });
});
