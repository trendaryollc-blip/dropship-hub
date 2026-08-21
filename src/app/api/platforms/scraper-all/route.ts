import { NextRequest, NextResponse } from "next/server";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY;

const platformUrls: Record<string, (q: string) => string> = {
  temu: (q) => `https://www.temu.com/search_result.html?search_key=${encodeURIComponent(q)}`,
  shein: (q) => `https://us.shein.com/pdsearch/${encodeURIComponent(q)}`,
  etsy: (q) => `https://www.etsy.com/search?q=${encodeURIComponent(q)}`,
  alibaba: (q) => `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`,
  banggood: (q) => `https://www.banggood.com/search/${encodeURIComponent(q)}.html`,
  dhgate: (q) => `https://www.dhgate.com/wholesale/search.html?searchkey=${encodeURIComponent(q)}`,
};

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
    const { query, platform } = await request.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });
    if (!platformUrls[platform]) return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    if (!SCRAPER_API_KEY && !ZENROWS_API_KEY) {
      return NextResponse.json({ error: "No scraper API configured" }, { status: 503 });
    }

    const url = platformUrls[platform](query);
    const html = await scrapeUrl(url);
    const products = extractProducts(html, platform);
    return NextResponse.json({ data: { search_results: products }, source: platform, query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Search failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ platform: "Scraper Platforms", configured: !!(SCRAPER_API_KEY || ZENROWS_API_KEY), supported: Object.keys(platformUrls) });
}
