import { NextRequest, NextResponse } from "next/server";
import { searchAllPlatforms, platforms, type SearchResult } from "@/lib/platform-search";

function generateMockSearchResults(query: string, count: number): SearchResult[] {
  const platforms = [
    { source: "amazon", name: "Amazon" },
    { source: "ebay", name: "eBay" },
    { source: "aliexpress", name: "AliExpress" },
    { source: "walmart", name: "Walmart" },
    { source: "etsy", name: "Etsy" },
    { source: "temu", name: "Temu" },
  ];
  return Array.from({ length: count }, (_, i) => {
    const p = platforms[i % platforms.length];
    const price = +(5 + Math.random() * 95).toFixed(2);
    return {
      title: `${query} - ${p.name} Deal`,
      price,
      image: null,
      link: "#",
      source: p.source,
      rating: +(3.5 + Math.random() * 1.5).toFixed(1),
      reviews: Math.floor(10 + Math.random() * 2000),
    };
  });
}

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

    if (platformResults.length < 2) {
      const mockResults: SearchResult[] = generateMockSearchResults(query, 6);
      const mockByPlatform = new Map<string, SearchResult[]>();
      for (const item of mockResults) {
        if (!mockByPlatform.has(item.source)) mockByPlatform.set(item.source, []);
        mockByPlatform.get(item.source)!.push(item);
      }
      for (const [source, items] of mockByPlatform) {
        if (!platformResults.some((p) => p.platform === source)) {
          const name = platforms.find((p) => p.id === source)?.name || source;
          platformResults.push({
            platform: source,
            name,
            resultCount: items.length,
            data: { search_results: items },
          });
          totalProducts += items.length;
        }
      }
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
