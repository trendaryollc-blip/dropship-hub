import type { SocialSignalData, DataSourceResult } from "./types";
import { getCached, setCache, CACHE_TTL } from "./cache";
import type { TrendPlatform } from "@/types/trend-predictor";

// Reddit's public JSON API requires a descriptive User-Agent; no key needed.
const REDDIT_UA = "web:dropship-hub:1.0 (trend analysis)";

interface RedditPost {
  title: string;
  score: number;
  numComments: number;
  permalink: string;
  subreddit: string;
  created: string;
}

interface RedditWindow {
  posts: RedditPost[];
}

async function fetchRedditWindow(keyword: string, window: "week" | "month"): Promise<RedditWindow> {
  const params = new URLSearchParams({
    q: keyword,
    sort: "top",
    t: window,
    limit: "25",
    raw_json: "1",
  });
  const res = await fetch(`https://www.reddit.com/search.json?${params}`, {
    headers: { "User-Agent": REDDIT_UA, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const payload = (await res.json()) as {
    data?: { children?: { data?: Record<string, unknown> }[] };
  };
  const posts = (payload.data?.children ?? [])
    .map((child) => {
      const d = child.data ?? {};
      return {
        title: String(d.title ?? ""),
        score: Number(d.score ?? 0),
        numComments: Number(d.num_comments ?? 0),
        permalink: `https://www.reddit.com${String(d.permalink ?? "")}`,
        subreddit: String(d.subreddit ?? ""),
        created: new Date(Number(d.created_utc ?? 0) * 1000).toISOString(),
      };
    })
    .filter((post) => post.title.length > 0);
  return { posts };
}

function buildRedditSignal(keyword: string, month: RedditWindow, week: RedditWindow): SocialSignalData {
  const volume = month.posts.reduce((sum, post) => sum + Math.max(0, post.score) + Math.max(0, post.numComments), 0);
  const totalScore = month.posts.reduce((sum, post) => sum + Math.max(0, post.score), 0);
  const totalComments = month.posts.reduce((sum, post) => sum + Math.max(0, post.numComments), 0);

  // Growth compares the last week's post count against the month's weekly run
  // rate (month/4.33) — two real observations, clamped to ±100.
  const monthRunRate = month.posts.length / 4.33;
  let growthRate = 0;
  if (monthRunRate > 0) {
    growthRate = Math.round(((week.posts.length - monthRunRate) / monthRunRate) * 100 * 10) / 10;
  }
  growthRate = Math.max(-100, Math.min(100, growthRate));

  // Real comments-per-100-upvotes ratio (0–100), not a guessed engagement score.
  const engagementRate = totalScore > 0 ? Math.min(100, Math.round((totalComments / totalScore) * 100 * 10) / 10) : 0;

  const topPosts = [...month.posts]
    .sort((a, b) => b.score + b.numComments - (a.score + a.numComments))
    .slice(0, 5)
    .map((post) => ({ text: post.title, engagement: post.score + post.numComments, url: post.permalink }));

  return {
    platform: "reddit",
    keyword,
    volume,
    growthRate,
    engagementRate,
    topPosts,
    fetchedAt: new Date().toISOString(),
  };
}

// Requested platforms with no adapter wired up yet, with their honest status.
const UNWIRED: { platform: TrendPlatform; label: string; keyHint?: string }[] = [
  { platform: "tiktok", label: "TikTok", keyHint: "TIKTOK_API_KEY" },
  { platform: "instagram", label: "Instagram", keyHint: "INSTAGRAM_GRAPH_TOKEN" },
  { platform: "twitter", label: "Twitter/X", keyHint: "TWITTER_BEARER_TOKEN" },
];

/**
 * Social signals. Reddit works today through its free public JSON API (two
 * windows: month for volume/top posts, week for growth). TikTok/Instagram/X
 * are honestly reported as not connected when requested — no fabricated
 * engagement numbers for unwired platforms.
 */
export async function fetchSocialSignals(
  keyword: string,
  platforms: TrendPlatform[] = ["tiktok", "instagram", "twitter", "reddit"]
): Promise<DataSourceResult<SocialSignalData[]>> {
  const cacheKey = `social:${keyword}:${[...platforms].sort().join(",")}`;
  const cached = await getCached<SocialSignalData[]>("social", cacheKey);
  if (cached) {
    return { success: true, data: cached, source: "reddit", fetchedAt: new Date().toISOString(), cached: true };
  }

  try {
    const results: SocialSignalData[] = [];
    const failures: string[] = [];

    if (platforms.includes("reddit")) {
      try {
        const [month, week] = await Promise.all([
          fetchRedditWindow(keyword, "month"),
          fetchRedditWindow(keyword, "week"),
        ]);
        if (month.posts.length === 0) {
          failures.push(`Reddit: no posts found for "${keyword}" in the last month`);
        } else {
          results.push(buildRedditSignal(keyword, month, week));
        }
      } catch (error) {
        failures.push(`Reddit: ${error instanceof Error ? error.message : "request failed"}`);
      }
    }

    for (const entry of UNWIRED) {
      if (!platforms.includes(entry.platform)) continue;
      const hasKey = entry.keyHint ? Boolean(process.env[entry.keyHint]) : false;
      failures.push(
        hasKey
          ? `${entry.label}: ${entry.keyHint} is set but no ${entry.label} adapter is wired up yet`
          : `${entry.label}: not connected (no API integration yet)`
      );
    }

    if (results.length === 0) {
      return {
        success: false,
        data: null,
        error: failures.length > 0 ? failures.join(" — ") : "No social sources were requested.",
        source: "reddit",
        fetchedAt: new Date().toISOString(),
        cached: false,
      };
    }

    await setCache("social", results, CACHE_TTL.SOCIAL_SIGNALS, cacheKey);
    return {
      success: true,
      data: results,
      source: results[0].platform,
      // Partial coverage stays visible: which requested sources came back empty
      // or are not wired up yet, alongside the platforms that did return data.
      error: failures.length > 0 ? failures.join(" — ") : undefined,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Social signals fetch failed",
      source: "reddit",
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
  }
}

export function convertSocialToSignal(
  data: SocialSignalData,
  category: string
): {
  volume: number;
  previousVolume: number;
  growthRate: number;
  velocity: number;
  acceleration: number;
  saturationLevel: number;
} {
  const volume = data.volume;
  const previousVolume = Math.round(volume / (1 + data.growthRate / 100));
  const growthRate = data.growthRate;
  const velocity = Math.max(0, Math.min(100, (growthRate + 50) / 2));
  const acceleration = Math.max(-50, Math.min(50, data.engagementRate - 5));
  const saturationLevel = Math.max(0, Math.min(100, 100 - data.engagementRate * 5));

  return {
    volume,
    previousVolume,
    growthRate: Math.round(growthRate * 10) / 10,
    velocity: Math.round(velocity * 10) / 10,
    acceleration: Math.round(acceleration * 10) / 10,
    saturationLevel: Math.round(Math.max(0, Math.min(100, saturationLevel))),
  };
}
