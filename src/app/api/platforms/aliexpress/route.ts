import { NextRequest, NextResponse } from "next/server";
import { searchAliExpress } from "@/lib/platform-search";

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    if (!process.env.SCRAPER_API_KEY) {
      return NextResponse.json(
        { error: "AliExpress search requires SCRAPER_API_KEY to be configured" },
        { status: 503 }
      );
    }

    const data = await searchAliExpress(query);
    return NextResponse.json({ data, source: "aliexpress", query });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AliExpress search failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    platform: "AliExpress",
    configured: !!process.env.SCRAPER_API_KEY,
  });
}
