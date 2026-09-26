import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchSocialSignals, convertSocialToSignal } from "./social";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function redditChildren(count: number, score: number, comments: number) {
  return Array.from({ length: count }, (_, i) => ({
    data: {
      title: `Post ${i + 1}: earbuds discussion`,
      score,
      num_comments: comments,
      permalink: `/r/earbuds/comments/abc${i}/post/`,
      subreddit: "earbuds",
      created_utc: 1735689600 + i * 86400,
    },
  }));
}

describe("fetchSocialSignals (Reddit free API)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    delete process.env.TIKTOK_API_KEY;
    delete process.env.INSTAGRAM_GRAPH_TOKEN;
    delete process.env.TWITTER_BEARER_TOKEN;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a Reddit signal from the month and week windows", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("t=week")) {
        return jsonResponse({ data: { children: redditChildren(6, 100, 20) } });
      }
      return jsonResponse({ data: { children: redditChildren(20, 100, 20) } });
    });

    const result = await fetchSocialSignals("wireless earbuds", ["reddit"]);
    expect(result.success).toBe(true);
    expect(result.source).toBe("reddit");
    expect(result.error).toBeUndefined();

    const signal = result.data?.[0];
    expect(signal).toBeDefined();
    expect(signal?.platform).toBe("reddit");
    expect(signal?.keyword).toBe("wireless earbuds");
    // 20 posts × (100 score + 20 comments)
    expect(signal?.volume).toBe(2400);
    // 400 comments / 2000 upvotes → 20% comments-per-100-upvotes
    expect(signal?.engagementRate).toBe(20);
    // week (6) vs month run rate (20/4.33 ≈ 4.62) → real growth, not a guess
    expect(signal?.growthRate).toBeGreaterThan(0);
    expect(signal?.growthRate).toBeLessThanOrEqual(100);
    expect(signal?.topPosts).toHaveLength(5);
    expect(signal?.topPosts[0]).toEqual({
      text: "Post 1: earbuds discussion",
      engagement: 120,
      url: "https://www.reddit.com/r/earbuds/comments/abc0/post/",
    });

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("www.reddit.com/search.json");
    expect(urls[0]).toContain("q=wireless+earbuds");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: expect.objectContaining({ "User-Agent": expect.stringContaining("dropship-hub") }),
    });
  });

  it("reports an honest failure when Reddit blocks the request", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "forbidden" }, 403));

    const result = await fetchSocialSignals("earbuds", ["reddit"]);
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/Reddit: HTTP 403/);
  });

  it("reports no posts found as an honest empty result", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: { children: [] } }));

    const result = await fetchSocialSignals("zzz-unfindable", ["reddit"]);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no posts found/);
  });

  it("says TikTok is not connected when requested without a key", async () => {
    const result = await fetchSocialSignals("earbuds", ["tiktok"]);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/TikTok: not connected/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says the TikTok key is set but unwired when a key exists", async () => {
    vi.stubEnv("TIKTOK_API_KEY", "tt_key");
    const result = await fetchSocialSignals("earbuds", ["tiktok"]);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/TIKTOK_API_KEY is set but no TikTok adapter is wired up/);
  });

  it("keeps partial coverage visible when Reddit succeeds and others are unwired", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("t=week")) {
        return jsonResponse({ data: { children: redditChildren(2, 100, 10) } });
      }
      return jsonResponse({ data: { children: redditChildren(8, 100, 10) } });
    });

    const result = await fetchSocialSignals("earbuds", ["reddit", "tiktok", "instagram"]);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.error).toMatch(/TikTok: not connected/);
    expect(result.error).toMatch(/Instagram: not connected/);
  });
});

describe("convertSocialToSignal", () => {
  it("converts a real Reddit signal without inventing values", () => {
    const converted = convertSocialToSignal(
      {
        platform: "reddit",
        keyword: "earbuds",
        volume: 2400,
        growthRate: 30,
        engagementRate: 20,
        topPosts: [],
        fetchedAt: "2026-01-01T00:00:00.000Z",
      },
      "general"
    );
    expect(converted.volume).toBe(2400);
    expect(converted.growthRate).toBe(30);
    expect(converted.velocity).toBeGreaterThanOrEqual(0);
    expect(converted.velocity).toBeLessThanOrEqual(100);
    expect(converted.saturationLevel).toBeGreaterThanOrEqual(0);
    expect(converted.saturationLevel).toBeLessThanOrEqual(100);
  });
});
