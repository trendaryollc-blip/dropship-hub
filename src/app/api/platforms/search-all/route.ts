import { NextRequest, NextResponse } from "next/server";
import { searchAllPlatforms, platforms } from "@/lib/platform-search";
import { getAllPlatforms } from "@/lib/platform-config";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { mergeProducts, type SearchResult as DedupSearchResult } from "@/lib/search/dedup";
import { enrichProducts } from "@/lib/search/enrichment";
import { parseIntentLocally, buildSearchKeywords, applyIntentToFilters, type ParsedIntent } from "@/lib/search/intent-parser";
import { rankProducts } from "@/lib/search/semantic-rank";

const logger = createLogger({ route: "api/search-all" });

// Streaming version of search-all
async function searchAllStreaming(
  query: string,
  selectedPlatforms: string[],
  _signal?: AbortSignal
): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      const sendEvent = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      
      try {
        // Determine which platforms to search
        let toSearch;
        try {
          const firestorePlatforms = await getAllPlatforms();
          if (firestorePlatforms.length > 0) {
            toSearch = firestorePlatforms.filter(p => 
              p.enabled && p.keys.length > 0 &&
              (selectedPlatforms.length === 0 || selectedPlatforms.includes(p.id))
            );
          }
        } catch {
          // Fall through to env-based
        }
        
        if (!toSearch || toSearch.length === 0) {
          toSearch = platforms.filter(p => 
            selectedPlatforms.length === 0 || selectedPlatforms.includes(p.id)
          );
        }
        
        // Notify which platforms we're searching
        sendEvent({
          type: "init",
          platforms: toSearch.map(p => ({ id: p.id, name: p.name || p.id })),
          total: toSearch.length,
        });
        
        // Search each platform and stream results as they complete
        const searchPromises = toSearch.map(async (platform) => {
          const platformId = platform.id;
          const platformName = platform.name || platformId;
          
          sendEvent({ type: "platform:start", platform: platformId });
          
          try {
            let data;
            // Try Firestore-based search first
            if ('searchFn' in platform && typeof platform.searchFn === 'function') {
              data = await (platform as { searchFn: (q: string) => Promise<unknown> }).searchFn(query);
            } else if ('envKey' in platform) {
              // Env-based fallback - use the platform's search function if available
              if ('searchFn' in platform) {
                data = await (platform as { searchFn: (q: string) => Promise<unknown> }).searchFn(query);
              }
            }
            
            if (!data) {
              sendEvent({
                type: "platform:error",
                platform: platformId,
                error: "No search function available",
              });
              return { platform: platformId, name: platformName, data: null, error: "No search function" };
            }
            
            // Normalize results for dedup
            const normalizedResults = normalizeForDedup(platformId, data);
            
            sendEvent({
              type: "platform:result",
              platform: platformId,
              results: normalizedResults,
              count: normalizedResults.length,
            });
            
            return { platform: platformId, name: platformName, data, error: undefined };
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            sendEvent({
              type: "platform:error",
              platform: platformId,
              error: errorMsg,
            });
            return { platform: platformId, name: platformName, data: null, error: errorMsg };
          }
        });
        
        // Wait for all platforms to complete
        const results = await Promise.all(searchPromises);
        
        // Run the enhancement pipeline
        const successful = results.filter(r => r.data !== null);
        const allRawResults: DedupSearchResult[] = [];
        for (const r of successful) {
          if (r.data) {
            allRawResults.push(...normalizeForDedup(r.platform, r.data));
          }
        }
        
        const intent = parseIntentLocally(query);
        const mergedProducts = mergeProducts(allRawResults);
        const enrichedProducts = enrichProducts(mergedProducts);
        const rankedProducts = rankProducts(enrichedProducts, intent);
        
        const enrichedFlatResults = rankedProducts.map((rp) => ({
          id: rp.id,
          title: rp.title,
          price: rp.bestPrice,
          image: rp.image,
          images: rp.images,
          link: rp.platforms[0]?.link || "#",
          source: rp.bestPlatform || rp.platforms[0]?.platform || "",
          brand: rp.brand,
          rating: rp.rating,
          reviews: rp.reviews,
          estimatedMargin: rp.estimatedMargin,
          goldenScore: rp.goldenScore,
          goldenRank: rp.goldenRank,
          trendPhase: rp.trendPhase,
          saturationLevel: rp.saturationLevel,
          competitionScore: rp.competitionScore,
          reviewVelocity: rp.reviewVelocity,
          priceStability: rp.priceStability,
          supplyChainScore: rp.supplyChainScore,
          platformCount: rp.platformCount,
          platforms: rp.platforms,
          bestPrice: rp.bestPrice,
          worstPrice: rp.worstPrice,
          priceSpread: rp.priceSpread,
          avgPrice: rp.avgPrice,
          bestPlatform: rp.bestPlatform,
          relevanceScore: rp.relevanceScore,
          rankReason: rp.rankReason,
        }));
        
        // Send final enriched results
        sendEvent({
          type: "done",
          results: enrichedFlatResults,
          totalResults: enrichedFlatResults.length,
          intent: {
            keywords: intent.keywords,
            priceMin: intent.priceMin,
            priceMax: intent.priceMax,
            platforms: intent.platforms,
            sortBy: intent.sortBy,
            minRating: intent.minRating,
            categories: intent.categories,
            brand: intent.brand,
            trending: intent.trending,
            confidence: intent.confidence,
          },
          filters: applyIntentToFilters(intent),
        });
        
        controller.close();
      } catch (error) {
        sendEvent({
          type: "error",
          error: error instanceof Error ? error.message : "Streaming search failed",
        });
        controller.close();
      }
    },
  });
}

function normalizeForDedup(platform: string, data: unknown): DedupSearchResult[] {
  const results: DedupSearchResult[] = [];
  const sourceData = data as Record<string, unknown>;
  const items = Array.isArray(data)
    ? data
    : (sourceData?.search_results as unknown[]) ?? (sourceData?.data as unknown[]) ?? (sourceData?.products as unknown[]) ?? [];
  if (!Array.isArray(items)) return results;
  items.forEach((item, _i) => {
    if (!item || typeof item !== "object") return;
    const product = item as Record<string, unknown>;
    if ("code" in product && "message" in product && Object.keys(product).length <= 3) return;
    const price =
      typeof product.price === "number"
        ? product.price
        : typeof product.sellPrice === "number"
          ? product.sellPrice
          : typeof product.extracted_price === "number"
            ? product.extracted_price
            : null;
    const primaryImage = (() => {
      const raw = product.image || product.thumbnail || product.imageUrl || product.productImage || "";
      const s = String(raw);
      return s && s !== "null" && s !== "undefined" ? s : null;
    })();
    const rawImages = product.images;
    const imagesArray = Array.isArray(rawImages)
      ? rawImages.map((img) => {
          if (typeof img === "string") return img;
          if (typeof img === "object" && img !== null) {
            const o = img as Record<string, unknown>;
            return String(o.link || o.url || o.large || o.high_res || o.thumbnail || "");
          }
          return "";
        }).filter((u) => u && u !== "null" && u !== "")
      : undefined;
    const allImages = imagesArray && imagesArray.length > 0 ? imagesArray : (primaryImage ? [primaryImage] : []);

    results.push({
      title: String(product.title || product.productName || product.name || "Product"),
      price,
      image: primaryImage,
      images: allImages && allImages.length > 0 ? allImages : undefined,
      link: String(product.link || product.itemWebUrl || product.url || product.product_link || "#"),
      source: platform,
      brand: typeof product.brand === "string" && product.brand ? String(product.brand) : undefined,
      rating: typeof product.rating === "number" ? product.rating : undefined,
      reviews: typeof product.reviews === "number" ? product.reviews : typeof product.total_ratings === "number" ? product.total_ratings : undefined,
    });
  });
  return results;
}

export const POST = withAuth(async (request: NextRequest, _uid: string) => {
  try {
    const { query, platforms: selectedPlatforms, intent: requestIntent, stream } = await request.json();

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    // Check if streaming is requested
    if (stream === true) {
      const searchStream = await searchAllStreaming(
        query,
        selectedPlatforms || [],
        request.signal
      );
      
      return new Response(searchStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming mode (original implementation)
    const results = await searchAllPlatforms(query, selectedPlatforms);

    results.forEach((r) => {
      if (r.error) {
        logger.error(`[search-all] ❌ ${r.platform} (${r.name}) FAILED:`, { error: r.error });
      } else if (r.data?.search_results?.length === 0) {
        logger.warn(`[search-all] ⚠️ ${r.platform} (${r.name}): 0 results`);
      } else {
        logger.info(`[search-all] ✅ ${r.platform} (${r.name}): ${r.data?.search_results?.length ?? 0} results`);
      }
    });

    const successful = results.filter((r) => r.data !== null && r.data?.search_results && r.data.search_results.length > 0);
    const failed = results.filter((r) => r.data === null || !r.data?.search_results || r.data.search_results.length === 0);

    const totalProducts = successful.reduce((acc, r) => {
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

    // ── Search Enhancement Pipeline (Features 1-4) ──
    // 1. Normalize all results into flat array for dedup
    const allRawResults: DedupSearchResult[] = [];
    for (const r of successful) {
      allRawResults.push(...normalizeForDedup(r.platform, r.data));
    }

    // 2. Parse intent from query
    let intent: ParsedIntent;
    if (requestIntent && typeof requestIntent === "object") {
      intent = { ...requestIntent, originalQuery: query } as ParsedIntent;
    } else {
      intent = parseIntentLocally(query);
    }
    const searchKeywords = buildSearchKeywords(intent);

    // 3. Merge/deduplicate products across platforms (Feature 1)
    const mergedProducts = mergeProducts(allRawResults);

    // 4. Enrich with validation intelligence (Feature 4)
    const enrichedProducts = enrichProducts(mergedProducts);

    // 5. Rank by semantic relevance (Feature 3)
    const rankedProducts = rankProducts(enrichedProducts, intent);

    // Convert ranked products to flat SearchResult array for client compatibility
    const enrichedFlatResults: Array<Record<string, unknown>> = rankedProducts.map((rp) => ({
      id: rp.id,
      title: rp.title,
      price: rp.bestPrice,
      image: rp.image,
      images: rp.images,
      link: rp.platforms[0]?.link || "#",
      source: rp.bestPlatform || rp.platforms[0]?.platform || "",
      brand: rp.brand,
      rating: rp.rating,
      reviews: rp.reviews,
      // Enrichment fields (Feature 4)
      estimatedMargin: rp.estimatedMargin,
      goldenScore: rp.goldenScore,
      goldenRank: rp.goldenRank,
      trendPhase: rp.trendPhase,
      saturationLevel: rp.saturationLevel,
      competitionScore: rp.competitionScore,
      reviewVelocity: rp.reviewVelocity,
      priceStability: rp.priceStability,
      supplyChainScore: rp.supplyChainScore,
      // Dedup fields (Feature 1)
      platformCount: rp.platformCount,
      platforms: rp.platforms,
      bestPrice: rp.bestPrice,
      worstPrice: rp.worstPrice,
      priceSpread: rp.priceSpread,
      avgPrice: rp.avgPrice,
      bestPlatform: rp.bestPlatform,
      // Rank fields (Feature 3)
      relevanceScore: rp.relevanceScore,
      rankReason: rp.rankReason,
    }));

    return NextResponse.json({
      query,
      platforms: platformResults,
      platformErrors,
      totalProducts,
      searchedPlatforms: results.length,
      successfulPlatforms: platformResults.length,
      // Pipeline results (Features 1-4)
      mergedProducts: enrichedFlatResults,
      intent: {
        keywords: intent.keywords,
        priceMin: intent.priceMin,
        priceMax: intent.priceMax,
        platforms: intent.platforms,
        sortBy: intent.sortBy,
        minRating: intent.minRating,
        categories: intent.categories,
        brand: intent.brand,
        trending: intent.trending,
        confidence: intent.confidence,
      },
      filters: applyIntentToFilters(intent),
      searchKeywords,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Multi-search failed" }, { status: 500 });
  }
}, LIMITS.PLATFORM_SEARCH);

export const GET = withAuth(async (_request: NextRequest, _uid: string) => {
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
}, LIMITS.PLATFORM_SEARCH);
