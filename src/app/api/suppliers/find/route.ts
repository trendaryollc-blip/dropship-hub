import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getSuppliers } from "@/lib/supplier-service";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const product = searchParams.get("product") || "";
    const category = searchParams.get("category") || "";
    const _source = searchParams.get("source") || "";
    const price = searchParams.get("price") ? parseFloat(searchParams.get("price")!) : 0;

    const suppliers = await getSuppliers();

    // Score each supplier by relevance to the product
    const scored = suppliers.map((supplier) => {
      let score = 0;
      const productLower = product.toLowerCase();
      const categoryLower = category.toLowerCase();

      // Category/specialization match (highest weight)
      for (const spec of supplier.specializations) {
        const specLower = spec.toLowerCase();
        if (productLower.includes(specLower) || specLower.includes(productLower)) score += 30;
        if (categoryLower && (categoryLower.includes(specLower) || specLower.includes(categoryLower))) score += 25;
      }

      // Catalog category match
      for (const cat of supplier.catalog.categories) {
        const catLower = cat.toLowerCase();
        if (productLower.includes(catLower) || catLower.includes(productLower)) score += 20;
        if (categoryLower && (categoryLower.includes(catLower) || catLower.includes(categoryLower))) score += 15;
      }

      // Price range compatibility
      if (price > 0) {
        const { min, max } = supplier.catalog.priceRange;
        if (min <= price && price <= max) score += 15;
        else if (price >= min * 0.5 && price <= max * 2) score += 8;
      }

      // Quality signals
      score += supplier.stats.reliabilityScore * 0.1;
      score += supplier.stats.rating * 2;
      if (supplier.trustBadge === "gold") score += 5;
      else if (supplier.trustBadge === "silver") score += 3;

      // Data freshness bonus
      if (supplier.dataSource === "live") score += 3;

      return { supplier, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return all suppliers but with relevance scores
    const results = scored.map(({ supplier, score }) => ({
      ...supplier,
      relevanceScore: Math.round(score),
    }));

    return NextResponse.json({
      suppliers: results,
      total: results.length,
      productQuery: product,
      categoryQuery: category,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to find suppliers", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
