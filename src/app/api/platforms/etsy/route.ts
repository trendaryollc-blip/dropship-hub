import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY;

async function scrapeUrl(url: string): Promise<{ html: string | null; error?: string }> {
  if (SCRAPER_API_KEY) {
    try {
      const params = new URLSearchParams({ api_key: SCRAPER_API_KEY, url, render: "true" });
      const res = await fetch(`https://api.scraperapi.com?${params}`, { signal: AbortSignal.timeout(30000) });
      if (res.ok) return { html: await res.text() };
      if (res.status === 429) return { html: null, error: "ScraperAPI rate limited (429)" };
      if (res.status === 402) return { html: null, error: "ScraperAPI quota exceeded (402)" };
      return { html: null, error: `ScraperAPI returned ${res.status}` };
    } catch (e) {
      if (e instanceof Error && e.name === "TimeoutError") return { html: null, error: "ScraperAPI request timed out (30s)" };
    }
  }
  if (ZENROWS_API_KEY) {
    try {
      const res = await fetch("https://api.zenrows.com/v1/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: ZENROWS_API_KEY, url, js_render: true, anti_bot: true }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return { html: await res.text() };
      if (res.status === 429) return { html: null, error: "ZenRows rate limited (429)" };
      return { html: null, error: `ZenRows returned ${res.status}` };
    } catch (e) {
      if (e instanceof Error && e.name === "TimeoutError") return { html: null, error: "ZenRows request timed out (30s)" };
    }
  }
  return { html: null, error: "No scraper API key configured" };
}

function extractProducts(html: string, source: string) {
  const titles = html.match(/<[^>]*(?:title|name|heading)[^>]*>([^<]{10,100})/gi) || [];
  const prices = html.match(/\$[\d,]+\.?\d*/g) || [];
  const imgs = html.match(/src="(https?:\/\/[^"]*\.(jpg|png|webp)[^"]*)/gi) || [];
  return titles.slice(0, 10).map((t, i) => ({
    title: t.replace(/<[^>]*>/g, "").trim(),
    price: prices[i] ? parseFloat(prices[i].replace(/[$,]/g, "")) : null,
    image: imgs[i]?.replace(/src="/, "") || null,
    source,
  }));
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { query } = await request.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });
    if (!SCRAPER_API_KEY && !ZENROWS_API_KEY) return NextResponse.json({ error: "No scraper configured", scraperError: "SCRAPER_API_KEY and ZENROWS_API_KEY are both missing" }, { status: 503 });

    const { html, error: scraperError } = await scrapeUrl(`https://www.etsy.com/search?q=${encodeURIComponent(query)}`);
    if (!html) {
      return NextResponse.json({ data: { search_results: [] }, source: "etsy", query, scraperError: scraperError || "Failed to fetch page" });
    }

    const products = extractProducts(html, "Etsy");
    return NextResponse.json({ data: { search_results: products }, source: "etsy", query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Etsy search failed", scraperError: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
});

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  return NextResponse.json({ platform: "Etsy", configured: !!(SCRAPER_API_KEY || ZENROWS_API_KEY) });
});
