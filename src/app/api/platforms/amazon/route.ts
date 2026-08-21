import { NextRequest, NextResponse } from "next/server";
import { searchAmazon } from "@/lib/platform-search";

export async function POST(request: NextRequest) {
  try {
    const { query, asin } = await request.json();

    if (!process.env.RAINFOREST_API_KEY) {
      return NextResponse.json({ error: "Rainforest API key not configured" }, { status: 503 });
    }

    if (asin) {
      const params = new URLSearchParams({
        api_key: process.env.RAINFOREST_API_KEY!,
        type: "product",
        amazon_domain: "amazon.com",
        asin,
        include_clause: "product(title,price,image,features,description,brand,rating,total_ratings,prime,buybox,variations)",
      });
      const res = await fetch(`https://api.rainforestapi.com/request?${params}`);
      if (!res.ok) throw new Error(`Rainforest ${res.status}`);
      const data = await res.json();
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
  return NextResponse.json({ platform: "Amazon", configured: !!process.env.RAINFOREST_API_KEY });
}
