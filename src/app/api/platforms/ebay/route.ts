import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

const EBAY_APP_ID = process.env.EBAY_APP_ID;

function isPlaceholderKey(key: string | undefined): boolean {
  return !key || key.startsWith("Your") || key === "placeholder";
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { query } = await request.json();

    if (isPlaceholderKey(EBAY_APP_ID)) {
      return NextResponse.json(
        { error: "eBay API not configured — requires OAuth 2.0 setup with real API keys. Get keys at https://developer.ebay.com/" },
        { status: 503 }
      );
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

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
    const data = await res.json();

    const items = (data.itemSummaries || []).map((item: Record<string, unknown>) => ({
      title: String(item.title || ""),
      price: typeof (item.price as Record<string, unknown>)?.value === "string"
        ? parseFloat((item.price as Record<string, string>).value)
        : null,
      image: String((item.image as Record<string, unknown>)?.imageUrl || ""),
      link: String(item.itemWebUrl || ""),
      source: "ebay",
    }));

    return NextResponse.json({ data: { search_results: items }, source: "ebay", query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "eBay search failed" }, { status: 500 });
  }
});

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  return NextResponse.json({ platform: "eBay", configured: !isPlaceholderKey(EBAY_APP_ID) });
});
