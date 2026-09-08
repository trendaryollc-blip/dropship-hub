import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getSuppliers } from "@/lib/supplier-service";
import { getPriceIntelligence, savePriceIntelligence, isPriceIntelligenceFresh } from "@/lib/data/price-intelligence";
import { PriceLookupInputSchema } from "@/lib/data/schemas";
import type { SupplierOffer, PriceIntelligenceProduct, SupplierProfile } from "@/types/supplier";

function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "")
    .trim();
}

function calculateTotalCost(offer: SupplierOffer): number {
  return offer.unitPrice + (offer.shippingCost / Math.max(offer.moq, 1));
}

function scoreOffer(offer: SupplierOffer): number {
  let score = 0;
  score += (100 - offer.totalCostPerUnit * 10) * 0.4;
  score += offer.reliabilityScore * 0.3;
  score += Math.max(0, 30 - offer.shippingDays * 3) * 0.2;
  score += offer.qualityScore * 0.1;
  return Math.max(0, Math.min(100, score));
}

function buildSupplierOffer(supplier: SupplierProfile, sellingPrice?: number): SupplierOffer {
  const priceMin = supplier.catalog.priceRange.min;
  const priceMax = supplier.catalog.priceRange.max;
  const unitPrice = (priceMin + priceMax) / 2;
  const shippingCost = supplier.shipping.freeShippingThreshold ? 0 : 5;
  const totalCostPerUnit = unitPrice + shippingCost;
  const estimatedMargin = sellingPrice ? ((sellingPrice - totalCostPerUnit) / sellingPrice) * 100 : 0;

  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    trustBadge: supplier.trustBadge,
    unitPrice,
    shippingCost,
    shippingDays: supplier.stats.shippingDays,
    moq: supplier.catalog.moq,
    totalCostPerUnit,
    estimatedMargin,
    inStock: true,
    sampleAvailable: supplier.catalog.samplesAvailable,
    samplePrice: supplier.catalog.samplePrice || 0,
    qualityScore: supplier.stats.qualityScore,
    reliabilityScore: supplier.stats.reliabilityScore,
  };
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get("product");
  const sellingPrice = searchParams.get("sellingPrice") ? parseFloat(searchParams.get("sellingPrice")!) : undefined;

  if (!product) {
    return NextResponse.json({ error: "product parameter is required" }, { status: 400 });
  }

  const productId = normalizeProductName(product).replace(/\s+/g, "-");

  // Check cache
  const fresh = await isPriceIntelligenceFresh(uid, productId);
  if (fresh) {
    const cached = await getPriceIntelligence(uid, productId);
    if (cached) {
      return NextResponse.json({ result: cached, cached: true });
    }
  }

  // Build offers from suppliers
  const suppliers = await getSuppliers();
  const offers: SupplierOffer[] = suppliers.map((s) => buildSupplierOffer(s, sellingPrice));
  offers.sort((a, b) => scoreOffer(b) - scoreOffer(a));

  const bestDeal = offers.length > 0 ? offers[0].supplierId : "";

  const result: PriceIntelligenceProduct = {
    id: productId,
    productQuery: product,
    normalizedProductName: normalizeProductName(product),
    category: "",
    lastUpdated: new Date().toISOString(),
    offers,
    bestDeal,
    priceHistory: [],
  };

  await savePriceIntelligence(uid, productId, result);

  return NextResponse.json({ result, cached: false });
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const input = PriceLookupInputSchema.parse(body);

    const productId = normalizeProductName(input.product).replace(/\s+/g, "-");

    // Check cache
    if (!input.forceRefresh) {
      const fresh = await isPriceIntelligenceFresh(uid, productId);
      if (fresh) {
        const cached = await getPriceIntelligence(uid, productId);
        if (cached) {
          return NextResponse.json({ result: cached, cached: true });
        }
      }
    }

    // Build offers
    const suppliers = await getSuppliers();
    const offers: SupplierOffer[] = suppliers.map((s) => buildSupplierOffer(s, input.sellingPrice));
    offers.sort((a, b) => scoreOffer(b) - scoreOffer(a));

    const bestDeal = offers.length > 0 ? offers[0].supplierId : "";

    const result: PriceIntelligenceProduct = {
      id: productId,
      productQuery: input.product,
      normalizedProductName: normalizeProductName(input.product),
      category: input.category || "",
      lastUpdated: new Date().toISOString(),
      offers,
      bestDeal,
      priceHistory: [],
    };

    await savePriceIntelligence(uid, productId, result);

    return NextResponse.json({ result, cached: false });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.message }, { status: 400 });
    }
    console.error("Price intel error:", error);
    return NextResponse.json({ error: "Failed to generate price intelligence" }, { status: 500 });
  }
});
