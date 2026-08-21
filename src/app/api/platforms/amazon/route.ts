import { NextRequest, NextResponse } from "next/server";

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;

async function searchAmazon(query: string) {
  const params = new URLSearchParams({
    api_key: RAINFOREST_API_KEY!,
    type: "search",
    amazon_domain: "amazon.com",
    search_term: query,
    include_clause: "search_results(title,price,image,link,asin,rating,total_ratings,prime,delivery,offer_count,buybox)",
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`);
  if (!res.ok) throw new Error(`Rainforest ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getAmazonProduct(asin: string) {
  const params = new URLSearchParams({
    api_key: RAINFOREST_API_KEY!,
    type: "product",
    amazon_domain: "amazon.com",
    asin,
    include_clause: "product(title,price,image,features,description,brand,rating,total_ratings,prime,buybox,variations)",
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`);
  if (!res.ok) throw new Error(`Rainforest ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { query, asin } = await request.json();

    if (!RAINFOREST_API_KEY) {
      return NextResponse.json({ error: "Rainforest API key not configured" }, { status: 503 });
    }

    if (asin) {
      const data = await getAmazonProduct(asin);
      return NextResponse.json({ data, source: "amazon" });
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const data = await searchAmazon(query);
    return NextResponse.json({ data, source: "amazon", query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Amazon search failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ platform: "Amazon", configured: !!RAINFOREST_API_KEY });
}
