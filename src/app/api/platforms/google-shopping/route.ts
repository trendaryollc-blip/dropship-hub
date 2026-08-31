import { NextRequest, NextResponse } from "next/server";
import { searchGoogleShopping } from "@/lib/platform-search";
import { withAuth } from "@/lib/auth";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { query } = await request.json();

    if (!process.env.SERP_API_KEY) {
      return NextResponse.json({ error: "SerpAPI key not configured" }, { status: 503 });
    }

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const data = await searchGoogleShopping(query);
    return NextResponse.json({ data, source: "google_shopping", query });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Google Shopping search failed" }, { status: 500 });
  }
});

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  return NextResponse.json({ platform: "Google Shopping", configured: !!process.env.SERP_API_KEY });
});
