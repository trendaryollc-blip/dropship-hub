import { NextRequest, NextResponse } from "next/server";

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;

async function searchAmazonProducts(query: string) {
  const params = new URLSearchParams({
    api_key: RAINFOREST_API_KEY!,
    type: "search",
    amazon_domain: "amazon.com",
    search_term: query,
    include_clause: "search_results(title,price,image,images,link,asin,rating,total_ratings,prime,delivery,offer_count)",
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`);
  if (!res.ok) throw new Error(`Rainforest API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getAmazonProductDetails(asin: string) {
  const params = new URLSearchParams({
    api_key: RAINFOREST_API_KEY!,
    type: "product",
    amazon_domain: "amazon.com",
    asin: asin,
    include_clause: "product(title,price,image,images,features,description,brand,manufacturer,rating,total_ratings,prime,delivery,buybox,variants,seller_info)",
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`);
  if (!res.ok) throw new Error(`Rainforest API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function searchAmazonByCategory(category: string) {
  const params = new URLSearchParams({
    api_key: RAINFOREST_API_KEY!,
    type: "search",
    amazon_domain: "amazon.com",
    search_term: category,
    include_clause: "search_results(title,price,image,link,asin,rating,total_ratings,prime)",
    sort: "featured",
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`);
  if (!res.ok) throw new Error(`Rainforest API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { query, action, asin } = await request.json();
    if (!RAINFOREST_API_KEY) {
      return NextResponse.json({ error: "Rainforest API key not configured" }, { status: 503 });
    }

    if (action === "product" && asin) {
      const data = await getAmazonProductDetails(asin);
      return NextResponse.json({ data, source: "rainforest", action: "product" });
    }

    if (action === "category" && query) {
      const data = await searchAmazonByCategory(query);
      return NextResponse.json({ data, source: "rainforest", action: "category", query });
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const data = await searchAmazonProducts(query);
    return NextResponse.json({ data, source: "rainforest", query });
  } catch {
    return NextResponse.json({ error: "Rainforest API request failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    platform: "Rainforest API (Amazon)",
    configured: !!RAINFOREST_API_KEY,
  });
}
