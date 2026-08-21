import { NextRequest, NextResponse } from "next/server";

const EBAY_APP_ID = process.env.EBAY_APP_ID;

async function searchEbay(query: string) {
  const params = new URLSearchParams({
    q: query,
    limit: "20",
    sort: "relevance",
    filter: "buyingOptions:{FIXED_PRICE|AUCTION}",
  });

  const res = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
    headers: {
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      Authorization: `Bearer ${EBAY_APP_ID}`,
    },
  });

  if (!res.ok) throw new Error(`eBay ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getEbayItem(itemId: string) {
  const res = await fetch(`https://api.ebay.com/buy/browse/v1/item/${itemId}`, {
    headers: {
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      Authorization: `Bearer ${EBAY_APP_ID}`,
    },
  });

  if (!res.ok) throw new Error(`eBay ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { query, itemId } = await request.json();

    if (!EBAY_APP_ID) {
      return NextResponse.json({ error: "eBay API key not configured" }, { status: 503 });
    }

    if (itemId) {
      const data = await getEbayItem(itemId);
      return NextResponse.json({ data, source: "ebay" });
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const data = await searchEbay(query);
    const items = (data.itemSummaries || []).map((item: Record<string, unknown>) => ({
      id: item.itemId,
      title: item.title,
      price: (item.price as Record<string, unknown>)?.value,
      currency: (item.price as Record<string, unknown>)?.currency,
      image: (item.image as Record<string, unknown>)?.imageUrl,
      link: item.itemWebUrl,
      condition: item.condition,
      seller: (item.seller as Record<string, unknown>)?.username,
      shipping: (item.shippingOptions as Record<string, unknown>[])?.[0]?.shippingCost,
    }));

    return NextResponse.json({ data: { search_results: items }, source: "ebay", query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "eBay search failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ platform: "eBay", configured: !!EBAY_APP_ID });
}
