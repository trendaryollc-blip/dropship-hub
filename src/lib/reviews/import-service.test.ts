import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseReviewsCsv,
  extractAsin,
  fetchAmazonReviewRows,
} from "./import-service";
import { ConfigMissingError, isAuthError, __resetPoolStateForTests } from "@/lib/api-keys/pool";
import { PublicError } from "@/lib/api-errors";

const VALID_CSV = [
  "rating,author,title,content,verified,image",
  '5,Jane D.,Love it,"Great quality, fast shipping",yes,https://img.example.com/1.jpg',
  '4,Bob,,"Pretty good overall",no,',
  "9,BadRow,,Invalid rating,,",
  '3,NoContent,,,yes,',
].join("\n");

describe("parseReviewsCsv", () => {
  it("parses valid rows and maps header aliases", () => {
    const result = parseReviewsCsv(VALID_CSV, 50);
    expect(result.rows).toHaveLength(2);
    expect(result.totalFound).toBe(4);
    expect(result.skipped).toBe(2);

    const [first, second] = result.rows;
    expect(first).toMatchObject({
      author: "Jane D.",
      rating: 5,
      title: "Love it",
      content: "Great quality, fast shipping",
      verified: true,
      images: ["https://img.example.com/1.jpg"],
    });
    expect(second.author).toBe("Bob");
    expect(second.rating).toBe(4);
    expect(second.verified).toBe(false);
    expect(second.images).toEqual([]);
  });

  it("accepts alternate column names (name/stars/review/comment)", () => {
    const csv = ["Stars,Name,Comment", "5,Alice,Amazing"].join("\n");
    const { rows } = parseReviewsCsv(csv, 10);
    expect(rows[0]).toMatchObject({ author: "Alice", rating: 5, content: "Amazing" });
  });

  it("enforces maxReviews and counts overflow as skipped", () => {
    const result = parseReviewsCsv(VALID_CSV, 1);
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(3);
    expect(result.totalFound).toBe(4);
  });

  it("throws an honest error for an empty file", () => {
    expect(() => parseReviewsCsv("   ", 10)).toThrow(PublicError);
    expect(() => parseReviewsCsv("   ", 10)).toThrow(/empty/);
  });

  it("throws when no row has a valid rating 1-5 plus content", () => {
    const csv = "rating,author,content\n9,X,yes\n,X,yes\n7,Y,z";
    expect(() => parseReviewsCsv(csv, 10)).toThrow(/No valid review rows/);
  });

  it("throws when the file exceeds 400KB", () => {
    const big = "rating,content\n" + "5,x\n".repeat(200_000);
    expect(() => parseReviewsCsv(big, 10)).toThrow(/too large/);
  });

  it("does not invent an author when the column is missing", () => {
    const { rows } = parseReviewsCsv("rating,content\n5,Nice", 10);
    expect(rows[0].author).toBe("Customer");
  });
});

describe("extractAsin", () => {
  it("extracts ASINs from common Amazon URL shapes", () => {
    expect(extractAsin("https://www.amazon.com/dp/B0ABC12345")).toBe("B0ABC12345");
    expect(extractAsin("https://www.amazon.com/gp/product/B0ABC12345?tag=x")).toBe("B0ABC12345");
    expect(extractAsin("https://amazon.com/s?k=B0ABC12345")).toBe("");
    expect(extractAsin("https://aliexpress.com/item/123.html")).toBe("");
  });
});

describe("fetchAmazonReviewRows", () => {
  const keys = ["RAINFOREST_API_KEYS", "RAINFOREST_API_KEY"] as const;
  const saved: Record<string, string | undefined> = {};
  const fetchMock = vi.fn();

  beforeEach(() => {
    for (const k of keys) saved[k] = process.env[k];
    delete process.env.RAINFOREST_API_KEYS;
    delete process.env.RAINFOREST_API_KEY;
    __resetPoolStateForTests();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("throws ConfigMissingError when no Rainforest key is configured", async () => {
    await expect(fetchAmazonReviewRows("B0ABC12345", 10)).rejects.toBeInstanceOf(ConfigMissingError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns real mapped rows and totalFound from the API", async () => {
    process.env.RAINFOREST_API_KEYS = "rf_key_1";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reviews_total: 1234,
        reviews: [
          {
            id: "R1",
            title: "Solid",
            content: "Works well",
            rating: 5,
            author: "Sam",
            verified_purchase: true,
            images: [{ medium: "https://m.example.com/a.jpg" }],
          },
          { id: "R2", content: "Meh", rating: 0, author: "X" },
        ],
      }),
    });

    const result = await fetchAmazonReviewRows("B0ABC12345", 10);
    expect(result.totalFound).toBe(1234);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      author: "Sam",
      rating: 5,
      title: "Solid",
      content: "Works well",
      verified: true,
      sourceReviewId: "R1",
      images: ["https://m.example.com/a.jpg"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain("asin=B0ABC12345");
    expect(calledUrl).toContain("api_key=rf_key_1");
  });

  it("stops at maxReviews", async () => {
    process.env.RAINFOREST_API_KEYS = "rf_key_1";
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reviews: [1, 2, 3, 4].map((i) => ({ id: `R${i}`, content: `c${i}`, rating: 5 })),
      }),
    });
    const { rows } = await fetchAmazonReviewRows("B0ABC12345", 2);
    expect(rows).toHaveLength(2);
  });

  it("throws an honest PublicError when the product has no reviews", async () => {
    process.env.RAINFOREST_API_KEYS = "rf_key_1";
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ reviews: [] }) });
    await expect(fetchAmazonReviewRows("B0ABC12345", 10)).rejects.toThrow(/No reviews found/);
  });

  it("throws a PublicError on HTTP failure (no fake rows)", async () => {
    process.env.RAINFOREST_API_KEYS = "rf_key_1";
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(fetchAmazonReviewRows("B0ABC12345", 10)).rejects.toThrow(/HTTP 500/);
  });

  it("surfaces 401 as an auth error so the key pool can rotate", async () => {
    process.env.RAINFOREST_API_KEYS = "rf_key_1,rf_key_2";
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    const error = await fetchAmazonReviewRows("B0ABC12345", 10).catch((e: unknown) => e);
    expect(isAuthError(error)).toBe(true);
  });
});
