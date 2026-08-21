import { NextRequest, NextResponse } from "next/server";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY;

async function scrapeUrl(url: string) {
  if (SCRAPER_API_KEY) {
    const params = new URLSearchParams({ api_key: SCRAPER_API_KEY, url, render: "true" });
    const res = await fetch(`https://api.scraperapi.com?${params}`);
    if (res.ok) return res.text();
  }
  if (ZENROWS_API_KEY) {
    const res = await fetch("https://api.zenrows.com/v1/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: ZENROWS_API_KEY, url, js_render: true, anti_bot: true }),
    });
    if (res.ok) return res.text();
  }
  throw new Error("No scraper available");
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

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });
    if (!SCRAPER_API_KEY && !ZENROWS_API_KEY) return NextResponse.json({ error: "No scraper configured" }, { status: 503 });
    const html = await scrapeUrl(`https://www.banggood.com/search/${encodeURIComponent(query)}.html`);
    const products = extractProducts(html, "Banggood");
    return NextResponse.json({ data: { search_results: products }, source: "banggood", query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Banggood search failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ platform: "Banggood", configured: !!(SCRAPER_API_KEY || ZENROWS_API_KEY) });
}
