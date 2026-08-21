import { NextRequest, NextResponse } from "next/server";

interface PlatformSearchConfig {
  id: string;
  name: string;
  endpoint: string;
  envKey: string;
}

const searchablePlatforms: PlatformSearchConfig[] = [
  { id: "amazon", name: "Amazon", endpoint: "/api/platforms/amazon", envKey: "RAINFOREST_API_KEY" },
  { id: "ebay", name: "eBay", endpoint: "/api/platforms/ebay", envKey: "EBAY_APP_ID" },
  { id: "google_shopping", name: "Google Shopping", endpoint: "/api/platforms/google-shopping", envKey: "SERP_API_KEY" },
  { id: "aliexpress", name: "AliExpress", endpoint: "/api/platforms/aliexpress", envKey: "RAINFOREST_API_KEY" },
  { id: "cj", name: "CJ Dropshipping", endpoint: "/api/platforms/cj", envKey: "CJ_API_KEY" },
  { id: "keepa", name: "Keepa", endpoint: "/api/platforms/keepa", envKey: "KEEPA_API_KEY" },
];

async function searchPlatform(platform: PlatformSearchConfig, query: string): Promise<unknown> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}${platform.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, platforms: selectedPlatforms } = await request.json();

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const platformsToSearch = selectedPlatforms
      ? searchablePlatforms.filter((p) => selectedPlatforms.includes(p.id))
      : searchablePlatforms;

    const results = await Promise.allSettled(
      platformsToSearch.map(async (platform) => {
        const data = await searchPlatform(platform, query);
        return { platform: platform.id, name: platform.name, data };
      })
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<{ platform: string; name: string; data: unknown }> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((r) => r.data !== null);

    const totalProducts = successful.reduce((acc, r) => {
      const d = r.data as Record<string, unknown>;
      const items = Array.isArray(d) ? d : d?.search_results ?? d?.data ?? d?.products ?? [];
      return acc + (Array.isArray(items) ? items.length : 0);
    }, 0);

    return NextResponse.json({
      query,
      platforms: successful.map((r) => ({
        platform: r.platform,
        name: r.name,
        resultCount: Array.isArray(r.data) ? r.data.length : (r.data as Record<string, unknown[]>)?.search_results?.length ?? 0,
        data: r.data,
      })),
      totalProducts,
      searchedPlatforms: platformsToSearch.length,
      successfulPlatforms: successful.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Multi-search failed" }, { status: 500 });
  }
}

export async function GET() {
  const available = searchablePlatforms.map((p) => ({
    id: p.id,
    name: p.name,
    configured: !!process.env[p.envKey],
  }));

  return NextResponse.json({ platforms: available });
}
