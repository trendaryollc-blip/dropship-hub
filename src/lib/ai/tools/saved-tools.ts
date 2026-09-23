import { z } from "zod";
import { createTool } from "./registry";
import { searchAllPlatforms } from "@/lib/platform-search";
import { getSuppliers } from "@/lib/supplier-service";
import type { SupplierProfile } from "@/types/supplier";

// ─── Saved-product AI tools ─────────────────────────────────────────────────
// The Saved page executes these tool IDs via /api/ai/execute. They were
// previously referenced without implementations (the runner returned
// "Tool not found"), which made every Saved-page AI action fail. These
// deterministic, data-driven implementations fill those gaps.

interface SearchOffer {
  title?: string;
  price?: number | null;
  source?: string;
  link?: string;
  rating?: number;
  reviews?: number;
}

function priceList(offers: SearchOffer[]): number[] {
  return offers
    .map((o) => Number(o.price))
    .filter((p) => Number.isFinite(p) && p > 0);
}

function formatOffers(offers: SearchOffer[], limit: number): string {
  return offers
    .slice(0, limit)
    .map((o) => `- ${o.title ?? "Untitled"} ($${Number(o.price).toFixed(2)}) via ${o.source ?? "unknown"}`)
    .join("\n");
}

// ─── Analyze Product ────────────────────────────────────────────────────────

export const analyzeProductTool = createTool({
  id: "analyze_product",
  name: "Analyze Product",
  description: "Analyze a saved product: live market price comparison, demand signals, and estimated sell price/margin at the standard 2.5x sourcing rule",
  category: "search",
  safetyLevel: "safe",
  inputSchema: z.object({
    productId: z.string().optional(),
    title: z.string().min(1).max(500),
    price: z.number().min(0).optional(),
  }),
  execute: async (input: Record<string, unknown>) => {
    const title = input.title as string;
    const sourcePrice = Number(input.price) || 0;

    let offers: SearchOffer[] = [];
    try {
      offers = (await searchAllPlatforms(title)) as SearchOffer[];
    } catch {
      offers = [];
    }
    const prices = priceList(offers);
    const marketAvg = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : 0;

    // Standard dropship sourcing heuristic: sell ≈ 2.5× source + shipping.
    const estimatedSource = sourcePrice > 0 ? sourcePrice : marketAvg > 0 ? marketAvg * 0.4 : 0;
    const suggestedSell = estimatedSource > 0 ? Number((estimatedSource * 2.5 + 4.99).toFixed(2)) : 0;
    const marginPct = suggestedSell > 0 && estimatedSource > 0
      ? Number((((suggestedSell - estimatedSource) / suggestedSell) * 100).toFixed(1))
      : 0;

    const rated = offers.filter((o) => Number(o.rating) > 0);
    const avgRatingValue = rated.length > 0
      ? rated.reduce((s, o) => s + Number(o.rating), 0) / rated.length
      : 0;

    const summary = offers.length === 0
      ? `No live offers found for "${title}". Connect platform API keys or try a broader title to get market pricing.`
      : `Market analysis for "${title}": ${offers.length} live offers, avg $${marketAvg.toFixed(2)} (range $${Math.min(...prices).toFixed(2)}–$${Math.max(...prices).toFixed(2)}). Est. sell price $${suggestedSell.toFixed(2)} → ${marginPct}% margin (standard sourcing rule).${avgRatingValue > 0 ? ` Avg rating ${avgRatingValue.toFixed(1)}★ across ${rated.length} offers.` : ""}`;

    return {
      success: offers.length > 0,
      data: {
        title,
        offerCount: offers.length,
        marketAvg: Number(marketAvg.toFixed(2)),
        marketMin: prices.length > 0 ? Number(Math.min(...prices).toFixed(2)) : 0,
        marketMax: prices.length > 0 ? Number(Math.max(...prices).toFixed(2)) : 0,
        estimatedSource: Number(estimatedSource.toFixed(2)),
        suggestedSell,
        estimatedMarginPct: marginPct,
        avgRating: Number(avgRatingValue.toFixed(1)),
        topOffers: offers.slice(0, 5),
      },
      summary,
      error: offers.length === 0 ? "No market data found" : undefined,
    };
  },
});

// ─── Find Similar Products ──────────────────────────────────────────────────

export const findSimilarProductsTool = createTool({
  id: "find_similar_products",
  name: "Find Similar Products",
  description: "Search live marketplaces for products similar to a saved product and return comparable offers",
  category: "search",
  safetyLevel: "safe",
  inputSchema: z.object({
    productId: z.string().optional(),
    title: z.string().min(1).max(500),
  }),
  execute: async (input: Record<string, unknown>) => {
    const title = input.title as string;
    let offers: SearchOffer[] = [];
    try {
      offers = (await searchAllPlatforms(title)) as SearchOffer[];
    } catch {
      offers = [];
    }
    const similar = offers.filter((o) => (o.title ?? "").toLowerCase() !== title.toLowerCase());
    if (similar.length === 0) {
      return {
        success: false,
        data: { title, results: [] },
        summary: `No similar products found for "${title}".`,
        error: "No similar products found",
      };
    }
    return {
      success: true,
      data: { title, results: similar.slice(0, 10) },
      summary: `Found ${similar.length} similar products to "${title}":\n${formatOffers(similar, 5)}`,
    };
  },
});

// ─── Calculate COGS ─────────────────────────────────────────────────────────

export const calculateCogsTool = createTool({
  id: "calculate_cogs",
  name: "Calculate COGS",
  description: "Estimate cost of goods sold and per-unit economics for a saved product (standard dropship sourcing rule — estimates, not observed invoices)",
  category: "financial",
  safetyLevel: "safe",
  inputSchema: z.object({
    productId: z.string().optional(),
    price: z.number().min(0),
  }),
  execute: async (input: Record<string, unknown>) => {
    const price = Number(input.price) || 0;
    if (price <= 0) {
      return {
        success: false,
        data: null,
        summary: "This product has no price recorded, so COGS can't be estimated.",
        error: "No price recorded",
      };
    }
    // Standard sourcing rule: sell ≈ 2.5× source; the remainder is fees/shipping.
    const estimatedCogs = Number((price / 2.5).toFixed(2));
    const grossProfit = Number((price - estimatedCogs).toFixed(2));
    const marginPct = Number(((grossProfit / price) * 100).toFixed(1));
    return {
      success: true,
      data: {
        sellingPrice: Number(price.toFixed(2)),
        estimatedCogs,
        grossProfit,
        marginPct,
        basis: "estimate",
      },
      summary: `Est. COGS for $${price.toFixed(2)} product: $${estimatedCogs} (gross profit $${grossProfit}, ${marginPct}% margin) using the standard 2.5× sourcing rule. Treat as an estimate — replace with supplier quotes for exact figures.`,
    };
  },
});

// ─── Compare Suppliers ──────────────────────────────────────────────────────

export const compareSuppliersTool = createTool({
  id: "compare_suppliers",
  name: "Compare Suppliers",
  description: "Score available suppliers against a product (specialization and catalog fit) and return a ranked comparison",
  category: "supplier",
  safetyLevel: "safe",
  inputSchema: z.object({
    productId: z.string().optional(),
    title: z.string().min(1).max(500),
    price: z.number().min(0).optional(),
  }),
  execute: async (input: Record<string, unknown>) => {
    const title = (input.title as string).toLowerCase();
    const price = Number(input.price) || 0;

    let suppliers: SupplierProfile[] = [];
    try {
      suppliers = await getSuppliers();
    } catch {
      suppliers = [];
    }

    const scored = suppliers.map((s) => {
      let score = 0;
      for (const spec of s.specializations) {
        const specLower = spec.toLowerCase();
        if (title.includes(specLower) || specLower.includes(title)) score += 30;
      }
      for (const cat of s.catalog.categories) {
        const catLower = cat.toLowerCase();
        if (title.includes(catLower) || catLower.includes(title)) score += 20;
      }
      if (price > 0) {
        const { min, max } = s.catalog.priceRange;
        if (min <= price && price <= max) score += 15;
      }
      score += s.stats.reliabilityScore * 0.1;
      score += s.stats.rating * 2;
      return { supplier: s, score: Math.round(score) };
    });
    scored.sort((a, b) => b.score - a.score);

    const ranked = scored.map(({ supplier, score }) => ({
      id: supplier.id,
      name: supplier.name,
      location: supplier.location,
      trustBadge: supplier.trustBadge,
      relevanceScore: score,
    }));

    return {
      success: ranked.length > 0,
      data: { title: input.title, suppliers: ranked },
      summary: ranked.length === 0
        ? "No suppliers are connected yet — add a supplier integration to compare options."
        : `Supplier comparison for "${input.title}":\n${ranked.map((s) => `- ${s.name} (fit score ${s.relevanceScore})`).join("\n")}`,
      error: ranked.length === 0 ? "No suppliers available" : undefined,
    };
  },
});