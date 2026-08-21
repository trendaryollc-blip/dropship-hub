import { NextRequest, NextResponse } from "next/server";
import { searchKeepaProducts } from "@/lib/platform-search";

const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

async function getKeepaProduct(asin: string) {
  const res = await fetch(`https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=1&asin=${asin}&stats=1,1,1`);
  if (!res.ok) throw new Error(`Keepa ${res.status}`);
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { query, asin } = await request.json();

    if (!KEEPA_API_KEY) {
      return NextResponse.json({ error: "Keepa API key not configured" }, { status: 503 });
    }

    if (asin) {
      const data = await getKeepaProduct(asin);
      const product = data.products?.[0];
      return NextResponse.json({
        data: {
          asin: product?.asin,
          title: product?.title,
          brand: product?.brand,
          category: product?.categoryTree,
          price: product?.stats?.current?.[0] ? product.stats.current[0] / 100 : null,
          avgPrice: product?.stats?.avg90?.[0] ? product.stats.avg90[0] / 100 : null,
          salesRank: product?.stats?.currentRank?.[0],
          rating: product?.rating,
          reviewCount: product?.reviewCount,
        },
        source: "keepa",
      });
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const data = await searchKeepaProducts(query);
    return NextResponse.json({ data, source: "keepa", query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Keepa search failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ platform: "Keepa", configured: !!KEEPA_API_KEY });
}
