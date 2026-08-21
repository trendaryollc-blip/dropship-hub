import { NextRequest, NextResponse } from "next/server";

const SERP_API_KEY = process.env.SERP_API_KEY;

async function searchGoogleShopping(query: string) {
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    api_key: SERP_API_KEY!,
    num: "20",
  });

  const res = await fetch(`https://serpapi.com/search?${params}`);
  if (!res.ok) throw new Error(`SerpAPI ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!SERP_API_KEY) {
      return NextResponse.json({ error: "SerpAPI key not configured" }, { status: 503 });
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const data = await searchGoogleShopping(query);

    const results = (data.shopping_results || []).map((item: Record<string, unknown>) => ({
      title: item.title,
      price: item.extracted_price || item.price,
      image: item.thumbnail,
      source: item.source,
      rating: item.rating,
      reviews: item.reviews,
      link: item.link || item.product_link,
    }));

    return NextResponse.json({ data: { search_results: results }, source: "google_shopping", query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google Shopping search failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ platform: "Google Shopping", configured: !!SERP_API_KEY });
}
