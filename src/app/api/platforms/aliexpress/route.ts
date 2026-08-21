import { NextRequest, NextResponse } from "next/server";

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;

async function searchAliExpressViaRainforest(query: string) {
  const params = new URLSearchParams({
    api_key: RAINFOREST_API_KEY!,
    type: "search",
    amazon_domain: "amazon.com",
    search_term: query,
    include_clause: "search_results(title,price,image,link,asin,rating,total_ratings,prime,delivery)",
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`);
  if (!res.ok) throw new Error(`Rainforest API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function searchAliExpressDirect(query: string) {
  const params = new URLSearchParams({
    appKey: process.env.ALIEXPRESS_API_KEY!,
    keywords: query,
    region: "US",
  });

  const res = await fetch(`https://api-sg.aliexpress.com/sync?${params}`);
  if (!res.ok) throw new Error(`AliExpress API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function searchAliExpressViaScraper(query: string) {
  const scraperKey = process.env.SCRAPER_API_KEY;
  if (!scraperKey) throw new Error("No scraper key available for AliExpress");

  const targetUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`;
  const params = new URLSearchParams({
    api_key: scraperKey,
    url: targetUrl,
    render: "true",
  });

  const res = await fetch(`https://api.scraperapi.com?${params}`);
  if (!res.ok) throw new Error(`ScraperAPI ${res.status}: ${await res.text()}`);
  const html = await res.text();
  return { html, source: "scraper" };
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const errors: string[] = [];

    // Try Rainforest API first (best for AliExpress)
    if (RAINFOREST_API_KEY) {
      try {
        const data = await searchAliExpressViaRainforest(query);
        return NextResponse.json({ data, source: "rainforest", query });
      } catch (e) {
        errors.push(`Rainforest: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    // Try AliExpress direct API
    if (process.env.ALIEXPRESS_API_KEY) {
      try {
        const data = await searchAliExpressDirect(query);
        return NextResponse.json({ data, source: "aliexpress_direct", query });
      } catch (e) {
        errors.push(`AliExpress Direct: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    // Try scraper API
    if (process.env.SCRAPER_API_KEY) {
      try {
        const data = await searchAliExpressViaScraper(query);
        return NextResponse.json({ data, source: "scraper", query });
      } catch (e) {
        errors.push(`Scraper: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    return NextResponse.json(
      { error: "All AliExpress sources failed", details: errors },
      { status: 503 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    platform: "AliExpress",
    configured: !!(process.env.RAINFOREST_API_KEY || process.env.ALIEXPRESS_API_KEY || process.env.SCRAPER_API_KEY),
  });
}
