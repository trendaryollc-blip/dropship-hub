import { NextRequest, NextResponse } from "next/server";

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;

interface ReviewData {
  averageRating: number;
  totalReviews: number;
  distribution: { stars: number; percent: number }[];
  sentiment: { positive: string[]; neutral: string[]; negative: string[] };
  topKeywords: string[];
  commonComplaints: string[];
  commonPraise: string[];
  trustworthyScore: number;
  reviews: { author: string; rating: number; title: string; content: string; date: string; verified: boolean }[];
}

function extractAsin(url: string): string {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/ASIN\/([A-Z0-9]{10})/i,
    /asin[=\/]([A-Z0-9]{10})/i,
  ];
  for (const pat of patterns) {
    const m = url.match(pat);
    if (m) return m[1];
  }
  return "";
}

function analyzeSentiment(reviews: { content: string; rating: number }[]): { positive: string[]; neutral: string[]; negative: string[] } {
  const positivePhrases: string[] = [];
  const neutralPhrases: string[] = [];
  const negativePhrases: string[] = [];

  const positiveKeywords = ["great", "excellent", "amazing", "love", "perfect", "best", "awesome", "fantastic", "wonderful", "highly recommend", "fast shipping", "good quality", "as described", "works well", "good value", "happy", "satisfied", "impressed"];
  const negativeKeywords = ["terrible", "awful", "worst", "hate", "broken", "defective", "poor quality", "waste", "disappointed", "slow shipping", "not as described", "cheap", "flimsy", "doesn't work", "return", "refund", "scam", "fake"];

  for (const review of reviews) {
    const text = review.content.toLowerCase();
    if (review.rating >= 4) {
      for (const kw of positiveKeywords) {
        if (text.includes(kw) && !positivePhrases.some((p) => p.toLowerCase().includes(kw))) {
          positivePhrases.push(review.content.slice(0, 80));
          break;
        }
      }
    } else if (review.rating <= 2) {
      for (const kw of negativeKeywords) {
        if (text.includes(kw) && !negativePhrases.some((p) => p.toLowerCase().includes(kw))) {
          negativePhrases.push(review.content.slice(0, 80));
          break;
        }
      }
    } else {
      if (review.content.length > 10 && neutralPhrases.length < 4) {
        neutralPhrases.push(review.content.slice(0, 80));
      }
    }
  }

  return {
    positive: positivePhrases.slice(0, 4).length > 0 ? positivePhrases.slice(0, 4) : ["No positive reviews found"],
    neutral: neutralPhrases.slice(0, 4).length > 0 ? neutralPhrases.slice(0, 4) : ["No neutral reviews found"],
    negative: negativePhrases.slice(0, 4).length > 0 ? negativePhrases.slice(0, 4) : ["No negative reviews found"],
  };
}

function extractKeywords(reviews: { content: string }[]): string[] {
  const wordCounts: Record<string, number> = {};
  const stopWords = new Set(["the", "a", "an", "is", "it", "to", "and", "of", "for", "in", "on", "was", "with", "that", "this", "i", "my", "me", "we", "our", "you", "your", "he", "she", "they", "them", "but", "not", "no", "so", "if", "or", "at", "by", "from", "as", "be", "are", "were", "been", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "can", "just", "also", "very", "too", "one", "two", "all", "its", "than"]);

  for (const review of reviews) {
    const words = review.content.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w));
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function calculateTrustScore(reviews: { rating: number; verified: boolean; content: string }[]): number {
  if (reviews.length === 0) return 50;

  const ratings = reviews.map((r) => r.rating);
  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);

  const verifiedPct = reviews.filter((r) => r.verified).length / reviews.length;
  const avgLength = reviews.reduce((sum, r) => sum + r.content.length, 0) / reviews.length;

  let score = 50;
  score += verifiedPct * 20;
  score += Math.min(avgLength / 50, 15);
  score -= Math.min(stdDev * 5, 15);
  if (reviews.length > 50) score += 10;
  else if (reviews.length > 20) score += 5;

  return Math.round(Math.max(20, Math.min(98, score)));
}

async function fetchAmazonReviews(asin: string): Promise<ReviewData | null> {
  if (!RAINFOREST_API_KEY) return null;

  try {
    const params = new URLSearchParams({
      api_key: RAINFOREST_API_KEY,
      type: "reviews",
      amazon_domain: "amazon.com",
      asin,
      include_clause: "reviews(title,content,rating,author,date,verified_purchase)",
      sort_by: "helpful",
      per_page: "20",
    });

    const res = await fetch(`https://api.rainforestapi.com/request?${params}`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const reviewList = data.reviews || [];
    const ratingSum = reviewList.reduce((sum: number, r: Record<string, unknown>) => sum + (typeof r.rating === "number" ? r.rating : 0), 0);
    const avgRating = reviewList.length > 0 ? +(ratingSum / reviewList.length).toFixed(1) : 0;

    const ratings = reviewList.map((r: Record<string, unknown>) => typeof r.rating === "number" ? r.rating : 0);
    const totalReviews = typeof data.reviews_total === "number" ? data.reviews_total : reviewList.length;

    const dist = [5, 4, 3, 2, 1].map((stars) => {
      const count = ratings.filter((r: number) => r === stars).length;
      return { stars, percent: reviewList.length > 0 ? Math.round((count / reviewList.length) * 100) : 0 };
    });

    const parsedReviews = reviewList.map((r: Record<string, unknown>) => ({
      author: String(r.author || "Anonymous"),
      rating: typeof r.rating === "number" ? r.rating : 0,
      title: String(r.title || ""),
      content: String(r.content || ""),
      date: String(r.date || ""),
      verified: Boolean(r.verified_purchase),
    }));

    return {
      averageRating: avgRating || (typeof data.rating === "number" ? data.rating : 0),
      totalReviews: totalReviews,
      distribution: dist,
      sentiment: analyzeSentiment(parsedReviews),
      topKeywords: extractKeywords(parsedReviews),
      commonComplaints: parsedReviews.filter((r: { rating: number; content: string }) => r.rating <= 2).slice(0, 3).map((r: { rating: number; content: string }) => r.content.slice(0, 80)),
      commonPraise: parsedReviews.filter((r: { rating: number; content: string }) => r.rating >= 4).slice(0, 3).map((r: { rating: number; content: string }) => r.content.slice(0, 80)),
      trustworthyScore: calculateTrustScore(parsedReviews),
      reviews: parsedReviews.slice(0, 10),
    };
  } catch {
    return null;
  }
}

async function scrapeGoogleShoppingReviews(url: string, _title: string): Promise<ReviewData | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    if (!res.ok) return null;

    const html = await res.text();

    const ratingMatch = html.match(/(\d+\.?\d*)\s*(?:out of|\/)\s*5/i) || html.match(/rating["']?\s*[:=]\s*["']?(\d+\.?\d*)/i);
    const reviewCountMatch = html.match(/([\d,]+)\s*(?:reviews?|ratings?)/i) || html.match(/reviews?["']?\s*[:=]\s*["']?([\d,]+)/i);

    const avgRating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    const totalReviews = reviewCountMatch ? parseInt(reviewCountMatch[1].replace(/,/g, ""), 10) : 0;

    const reviewBlocks = html.match(/(?:review|comment|feedback)[^<]{0,200}>([^<]{20,500})/gi) || [];
    const reviews = reviewBlocks.slice(0, 20).map((block) => {
      const text = block.replace(/<[^>]*>/g, "").replace(/^(?:review|comment|feedback)[^:]*:\s*/i, "").trim();
      const ratingGuess = text.toLowerCase().includes("great") || text.toLowerCase().includes("love") || text.toLowerCase().includes("excellent") ? 5
        : text.toLowerCase().includes("good") || text.toLowerCase().includes("nice") || text.toLowerCase().includes("works") ? 4
        : text.toLowerCase().includes("okay") || text.toLowerCase().includes("average") || text.toLowerCase().includes("decent") ? 3
        : text.toLowerCase().includes("bad") || text.toLowerCase().includes("poor") || text.toLowerCase().includes("disappointed") ? 2 : 3;
      return {
        author: "Customer",
        rating: ratingGuess,
        title: text.slice(0, 50),
        content: text.slice(0, 300),
        date: "",
        verified: false,
      };
    });

    if (reviews.length === 0 && totalReviews === 0) return null;

    const ratings = reviews.map((r) => r.rating);
    const calculatedAvg = ratings.length > 0 ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : avgRating;

    const dist = [5, 4, 3, 2, 1].map((stars) => {
      const count = ratings.filter((r) => r === stars).length;
      return { stars, percent: ratings.length > 0 ? Math.round((count / ratings.length) * 100) : 0 };
    });

    return {
      averageRating: calculatedAvg,
      totalReviews: totalReviews || reviews.length,
      distribution: dist,
      sentiment: analyzeSentiment(reviews),
      topKeywords: extractKeywords(reviews),
      commonComplaints: reviews.filter((r) => r.rating <= 2).slice(0, 3).map((r) => r.content.slice(0, 80)),
      commonPraise: reviews.filter((r) => r.rating >= 4).slice(0, 3).map((r) => r.content.slice(0, 80)),
      trustworthyScore: calculateTrustScore(reviews),
      reviews: reviews.slice(0, 10),
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, source, title, rating, reviews: reviewCount } = await request.json();

    if (source === "amazon") {
      const asin = extractAsin(url || "");
      if (asin) {
        const data = await fetchAmazonReviews(asin);
        if (data) {
          return NextResponse.json(data);
        }
      }
    }

    if (source === "google_shopping" && url) {
      const data = await scrapeGoogleShoppingReviews(url, title || "");
      if (data) {
        return NextResponse.json(data);
      }
    }

    const fallbackRating = typeof rating === "number" ? rating : 0;
    const fallbackCount = typeof reviewCount === "number" ? reviewCount : 0;

    if (fallbackRating > 0 || fallbackCount > 0) {
      return NextResponse.json({
        averageRating: fallbackRating,
        totalReviews: fallbackCount,
        distribution: [
          { stars: 5, percent: 35 },
          { stars: 4, percent: 25 },
          { stars: 3, percent: 20 },
          { stars: 2, percent: 12 },
          { stars: 1, percent: 8 },
        ],
        sentiment: {
          positive: ["Review data unavailable from this source"],
          neutral: [],
          negative: [],
        },
        topKeywords: [],
        commonComplaints: [],
        commonPraise: [],
        trustworthyScore: 50,
        reviews: [],
      });
    }

    return NextResponse.json({ error: "Unable to fetch reviews" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}
