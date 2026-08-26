import { NextRequest, NextResponse } from "next/server";

const SERP_API_KEY = process.env.SERP_API_KEY;

interface ListingSuggestion {
  title: string;
  description: string;
  tags: string[];
  suggestedPriceRange: string;
  platformTips: { platform: string; tip: string }[];
}

async function fetchCompetitorListings(query: string): Promise<{ titles: string[]; descriptions: string[]; priceRange: { min: number; max: number } } | null> {
  if (!SERP_API_KEY) return null;

  try {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: query,
      api_key: SERP_API_KEY,
      num: "10",
    });

    const res = await fetch(`https://serpapi.com/search?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const results = data.shopping_results || [];

    const titles = results
      .map((r: { title?: string }) => r.title)
      .filter((t: unknown): t is string => typeof t === "string" && t.length > 5)
      .slice(0, 8);

    const prices = results
      .map((r: { extracted_price?: number; price?: number }) => r.extracted_price || (typeof r.price === "number" ? r.price : 0))
      .filter((p: number) => p > 0);

    return {
      titles,
      descriptions: [],
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
    };
  } catch {
    return null;
  }
}

function generateListingFromCompetitors(
  title: string,
  category: string,
  price: number,
  competitorData: { titles: string[]; priceRange: { min: number; max: number } } | null
): ListingSuggestion {
  const priceMin = competitorData?.priceRange.min || price * 0.8;
  const priceMax = competitorData?.priceRange.max || price * 2.0;

  const titleWords = title.split(" ").filter((w) => w.length > 2);
  const keywords = titleWords.slice(0, 6).map((w) => w.toLowerCase());

  const suggestedTitle = `Premium ${title} - Fast Free Shipping & Easy Returns`;

  const bulletPoints = [
    `High-quality ${category.toLowerCase()} designed for durability and performance`,
    `Fast and reliable shipping with tracking on all orders`,
    `30-day money-back guarantee for hassle-free returns`,
    `Compact and lightweight design, perfect for everyday use`,
    `Makes an excellent gift for friends and family`,
  ];

  const suggestedDescription = bulletPoints.join(". ") + `. Shop with confidence — trusted by thousands of happy customers.`;

  const platformTips = [
    {
      platform: "Amazon",
      tip: `Use FBA for Prime badge and Buy Box advantage. Optimize listing with A+ Content. Target keywords: "${keywords.slice(0, 3).join(", ")}". Consider bundled offers to increase AOV.`,
    },
    {
      platform: "Shopify",
      tip: `High margin potential with direct traffic. Focus on Facebook/Instagram ads with lifestyle photos. Use urgency tactics like countdown timers and limited stock alerts.`,
    },
    {
      platform: "eBay",
      tip: `List as auction for engagement or Buy It Now for steady sales. Use best offer feature. Cross-list on multiple marketplaces for maximum exposure.`,
    },
  ];

  return {
    title: suggestedTitle,
    description: suggestedDescription,
    tags: keywords,
    suggestedPriceRange: `$${priceMin.toFixed(2)} - $${priceMax.toFixed(2)}`,
    platformTips,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { title, category, price, platform: _platform } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Product title is required" }, { status: 400 });
    }

    const query = title.slice(0, 80);
    const priceNum = typeof price === "number" ? price : 29.99;

    const competitorData = await fetchCompetitorListings(query);
    const listing = generateListingFromCompetitors(title, category || "General", priceNum, competitorData);

    return NextResponse.json(listing);
  } catch {
    return NextResponse.json({ error: "Failed to generate listing" }, { status: 500 });
  }
}
