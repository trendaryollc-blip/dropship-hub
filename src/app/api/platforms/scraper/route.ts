import { NextRequest, NextResponse } from "next/server";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY;

const platformConfigs: Record<string, { name: string; searchUrl: (q: string) => string }> = {
  walmart: {
    name: "Walmart",
    searchUrl: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
  },
  temu: {
    name: "Temu",
    searchUrl: (q) => `https://www.temu.com/search_result.html?search_key=${encodeURIComponent(q)}`,
  },
  shein: {
    name: "SHEIN",
    searchUrl: (q) => `https://us.shein.com/pdsearch/${encodeURIComponent(q)}`,
  },
  etsy: {
    name: "Etsy",
    searchUrl: (q) => `https://www.etsy.com/search?q=${encodeURIComponent(q)}`,
  },
  alibaba: {
    name: "Alibaba",
    searchUrl: (q) => `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`,
  },
  banggood: {
    name: "Banggood",
    searchUrl: (q) => `https://www.banggood.com/search/${encodeURIComponent(q)}.html`,
  },
  dhgate: {
    name: "DHgate",
    searchUrl: (q) => `https://www.dhgate.com/wholesale/search.html?searchkey=${encodeURIComponent(q)}`,
  },
};

async function scrapeWithScraperAPI(url: string) {
  const params = new URLSearchParams({
    api_key: SCRAPER_API_KEY!,
    url,
    render: "true",
  });
  const res = await fetch(`https://api.scraperapi.com?${params}`);
  if (!res.ok) throw new Error(`ScraperAPI ${res.status}`);
  return res.text();
}

async function scrapeWithZenRows(url: string) {
  const res = await fetch("https://api.zenrows.com/v1/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: ZENROWS_API_KEY,
      url,
      js_render: true,
      anti_bot: true,
    }),
  });
  if (!res.ok) throw new Error(`ZenRows ${res.status}`);
  return res.text();
}

async function scrapePlatform(platformId: string, query: string) {
  const config = platformConfigs[platformId];
  if (!config) throw new Error(`Unknown platform: ${platformId}`);

  const url = config.searchUrl(query);
  let html: string;

  // Try ScraperAPI first, fallback to ZenRows
  if (SCRAPER_API_KEY) {
    try {
      html = await scrapeWithScraperAPI(url);
    } catch {
      if (ZENROWS_API_KEY) {
        html = await scrapeWithZenRows(url);
      } else {
        throw new Error("No scraper available");
      }
    }
  } else if (ZENROWS_API_KEY) {
    html = await scrapeWithZenRows(url);
  } else {
    throw new Error("No scraper API configured");
  }

  // Basic HTML parsing to extract product-like data
  const titleMatches = html.match(/<[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)</gi) || [];
  const priceMatches = html.match(/\$[\d,]+\.?\d*/g) || [];
  const imgMatches = html.match(/src="(https?:\/\/[^"]*\.(jpg|png|webp)[^"]*)/gi) || [];

  const products = titleMatches.slice(0, 10).map((_, i) => ({
    title: titleMatches[i]?.replace(/<[^>]*>/g, "").trim() || `Product ${i + 1}`,
    price: priceMatches[i] ? parseFloat(priceMatches[i].replace(/[$,]/g, "")) : null,
    image: imgMatches[i]?.replace(/src="/, "") || null,
    source: config.name,
  }));

  return { products, source: platformId, query, total: products.length };
}

export async function POST(request: NextRequest) {
  try {
    const { query, platform } = await request.json();

    if (!platform || !platformConfigs[platform]) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    if (!SCRAPER_API_KEY && !ZENROWS_API_KEY) {
      return NextResponse.json({ error: "No scraper API configured" }, { status: 503 });
    }

    const data = await scrapePlatform(platform, query);
    return NextResponse.json({ data, source: platform, query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scrape failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    platform: "Scraper-Based Platforms",
    configured: !!(SCRAPER_API_KEY || ZENROWS_API_KEY),
    supported: Object.keys(platformConfigs),
  });
}
