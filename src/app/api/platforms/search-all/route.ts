import { NextRequest, NextResponse } from "next/server";
import { searchAllPlatforms, platforms } from "@/lib/platform-search";

export async function POST(request: NextRequest) {
  try {
    const { query, platforms: selectedPlatforms } = await request.json();

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const results = await searchAllPlatforms(query, selectedPlatforms);

    const successful = results.filter((r) => r.data !== null);

    let totalProducts = successful.reduce((acc, r) => {
      const items = r.data?.search_results ?? [];
      return acc + items.length;
    }, 0);

    const platformResults = successful.map((r) => ({
      platform: r.platform,
      name: r.name,
      resultCount: r.data?.search_results?.length ?? 0,
      data: r.data,
    }));

    if (platformResults.length === 0) {
      return NextResponse.json({
        query,
        platforms: [],
        totalProducts: 0,
        searchedPlatforms: selectedPlatforms
          ? platforms.filter((p) => selectedPlatforms.includes(p.id)).length
          : platforms.length,
        successfulPlatforms: 0,
        error: "No platforms returned results. Check your API keys in .env.local.",
      });
    }

    return NextResponse.json({
      query,
      platforms: platformResults,
      totalProducts,
      searchedPlatforms: selectedPlatforms
        ? platforms.filter((p) => selectedPlatforms.includes(p.id)).length
        : platforms.length,
      successfulPlatforms: platformResults.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Multi-search failed" }, { status: 500 });
  }
}

export async function GET() {
  const available = platforms.map((p) => ({
    id: p.id,
    name: p.name,
    configured: !!process.env[p.envKey],
  }));

  return NextResponse.json({ platforms: available });
}
