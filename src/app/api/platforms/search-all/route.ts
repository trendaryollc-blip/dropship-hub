import { NextRequest, NextResponse } from "next/server";
import { searchAllPlatforms, platforms } from "@/lib/platform-search";
import { getAllPlatforms } from "@/lib/platform-config";

export async function POST(request: NextRequest) {
  try {
    const { query, platforms: selectedPlatforms } = await request.json();

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const results = await searchAllPlatforms(query, selectedPlatforms);

    // Detailed logging for debugging
    results.forEach((r) => {
      if (r.error) {
        console.error(`[search-all] ❌ ${r.platform} (${r.name}) FAILED:`, r.error);
      } else if (r.data?.search_results?.length === 0) {
        console.warn(`[search-all] ⚠️ ${r.platform} (${r.name}): 0 results`);
      } else {
        console.log(`[search-all] ✅ ${r.platform} (${r.name}): ${r.data?.search_results?.length ?? 0} results`);
      }
    });

    const successful = results.filter((r) => r.data !== null && r.data?.search_results && r.data.search_results.length > 0);
    const failed = results.filter((r) => r.data === null || !r.data?.search_results || r.data.search_results.length === 0);

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

    const platformErrors = failed.map((r) => ({
      platform: r.platform,
      name: r.name,
      error: r.error || "No results returned",
    }));

    return NextResponse.json({
      query,
      platforms: platformResults,
      platformErrors,
      totalProducts,
      searchedPlatforms: results.length,
      successfulPlatforms: platformResults.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Multi-search failed" }, { status: 500 });
  }
}

export async function GET() {
  // Try to get platforms from Firestore
  try {
    const firestorePlatforms = await getAllPlatforms();
    if (firestorePlatforms.length > 0) {
      return NextResponse.json({
        platforms: firestorePlatforms.map((p) => ({
          id: p.id,
          name: p.name,
          method: p.method,
          enabled: p.enabled,
          configured: p.keys.length > 0,
          health: p.lastHealth,
          keysCount: p.keys.length,
        })),
        source: "firestore",
      });
    }
  } catch {
    // Fall through to env-based
  }

  // Fallback to env-based
  const available = platforms.map((p) => ({
    id: p.id,
    name: p.name,
    configured: !!process.env[p.envKey],
    method: "env",
    enabled: true,
    health: "untested",
    keysCount: !!process.env[p.envKey] ? 1 : 0,
  }));

  return NextResponse.json({ platforms: available, source: "env" });
}
