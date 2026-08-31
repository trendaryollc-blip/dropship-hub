import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

const PRICECHARTING_API_KEY = process.env.PRICECHARTING_API_KEY;

async function searchPriceCharting(query: string) {
  const params = new URLSearchParams({
    t: PRICECHARTING_API_KEY!,
    q: query,
  });

  const res = await fetch(`https://www.pricecharting.com/api/products?${params}`);
  if (!res.ok) throw new Error(`PriceCharting ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getProductPrice(productId: string) {
  const params = new URLSearchParams({
    t: PRICECHARTING_API_KEY!,
    id: productId,
  });

  const res = await fetch(`https://www.pricecharting.com/api/product?${params}`);
  if (!res.ok) throw new Error(`PriceCharting ${res.status}: ${await res.text()}`);
  return res.json();
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { query, productId } = await request.json();

    if (!PRICECHARTING_API_KEY) {
      return NextResponse.json({ error: "PriceCharting API key not configured" }, { status: 503 });
    }

    if (productId) {
      const data = await getProductPrice(productId);
      return NextResponse.json({ data, source: "pricecharting" });
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const data = await searchPriceCharting(query);
    return NextResponse.json({ data, source: "pricecharting", query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "PriceCharting search failed" }, { status: 500 });
  }
});

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  return NextResponse.json({ platform: "PriceCharting", configured: !!PRICECHARTING_API_KEY });
});
