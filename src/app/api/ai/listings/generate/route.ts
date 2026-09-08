import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, ListingGenerateSchema } from "@/lib/validation";
import { generateListing } from "@/lib/listing-generator";
import { addListing } from "@/lib/data/product-listings";
import type { ListingGenerationRequest } from "@/types/product-listing";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(ListingGenerateSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data as ListingGenerationRequest;
    const startTime = Date.now();
    const result = generateListing(data);

    await addListing(uid, {
      platform: result.listing.platform,
      title: result.listing.title,
      description: result.listing.description,
      bulletPoints: result.listing.bulletPoints,
      seoTags: result.listing.seoTags,
      backendKeywords: result.listing.backendKeywords,
      storyDescription: result.listing.storyDescription,
      characterCounts: result.listing.characterCounts,
      optimizationScore: result.listing.optimizationScore,
      productTitle: data.product.title,
      productImage: data.product.images[0] || undefined,
      productPrice: data.product.price,
    });

    return NextResponse.json({
      listing: result.listing,
      alternatives: result.alternatives,
      keywordSuggestions: result.keywordSuggestions,
      generationTime: Date.now() - startTime,
      provider: result.provider,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate listing", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);
