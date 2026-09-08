import { z } from "zod";
import { createTool } from "./registry";
import { generateListing, validateListingForPlatform, PLATFORM_CONFIGS } from "@/lib/listing-generator";
import type { PlatformType, ProductInput, ListingGenerationRequest } from "@/types/product-listing";

// ─── Generate Listing ───────────────────────────────────────────────────────

export const generateListingTool = createTool({
  id: "generate_listing",
  name: "Generate Product Listing",
  description: "Generate an optimized product listing for Amazon, Shopify, Etsy, eBay, or Walmart",
  category: "listing",
  safetyLevel: "safe",
  inputSchema: z.object({
    title: z.string().min(1).max(500),
    description: z.string().min(1).max(5000),
    price: z.number().min(0),
    category: z.string().min(1).max(200),
    images: z.array(z.string().url()).max(10).optional().default([]),
    specifications: z.record(z.string(), z.string()).optional().default({}),
    supplierUrl: z.string().url().optional(),
    supplierName: z.string().max(200).optional(),
    platform: z.enum(["amazon", "shopify", "etsy", "ebay", "walmart"]),
    tone: z.enum(["professional", "casual", "luxury", "budget", "handmade"]).optional(),
    targetAudience: z.string().max(500).optional(),
  }),
  execute: async (input: Record<string, unknown>) => {
    const product: ProductInput = {
      title: input.title as string,
      description: input.description as string,
      price: input.price as number,
      category: input.category as string,
      images: (input.images as string[]) || [],
      specifications: (input.specifications as Record<string, string>) || {},
      supplierUrl: input.supplierUrl as string | undefined,
      supplierName: input.supplierName as string | undefined,
    };

    const request: ListingGenerationRequest = {
      product,
      platform: input.platform as PlatformType,
      tone: input.tone as ListingGenerationRequest["tone"],
      targetAudience: input.targetAudience as string | undefined,
    };

    const result = generateListing(request);
    const validation = validateListingForPlatform(result.listing);

    return {
      success: true,
      data: {
        listing: result.listing,
        alternatives: result.alternatives,
        keywordSuggestions: result.keywordSuggestions,
        validation,
        generationTime: result.generationTime,
      },
      summary: `Generated ${input.platform} listing (score: ${result.listing.optimizationScore}/100). Title: "${result.listing.title}". ${result.listing.bulletPoints.length} bullet points, ${result.listing.seoTags.length} SEO tags. ${validation.valid ? "Valid ✓" : `Issues: ${validation.errors.join("; ")}`}`,
    };
  },
});

// ─── Validate Listing ───────────────────────────────────────────────────────

export const validateListingTool = createTool({
  id: "validate_listing",
  name: "Validate Listing",
  description: "Validate a product listing against platform-specific requirements",
  category: "listing",
  safetyLevel: "safe",
  inputSchema: z.object({
    platform: z.enum(["amazon", "shopify", "etsy", "ebay", "walmart"]),
    title: z.string().min(1),
    description: z.string().min(1),
    bulletPoints: z.array(z.string()).min(1),
    seoTags: z.array(z.string()).optional().default([]),
    backendKeywords: z.array(z.string()).optional(),
  }),
  execute: async (input: Record<string, unknown>) => {
    const config = PLATFORM_CONFIGS[input.platform as PlatformType];
    const errors: string[] = [];

    if ((input.title as string).length > config.maxLengths.title) {
      errors.push(`Title exceeds ${config.maxLengths.title} chars (${(input.title as string).length})`);
    }
    if ((input.description as string).length > config.maxLengths.description) {
      errors.push(`Description exceeds ${config.maxLengths.description} chars (${(input.description as string).length})`);
    }
    if ((input.bulletPoints as string[]).length < config.requirements.bulletPoints) {
      errors.push(`Need ${config.requirements.bulletPoints} bullet points, got ${(input.bulletPoints as string[]).length}`);
    }
    for (let i = 0; i < (input.bulletPoints as string[]).length; i++) {
      if ((input.bulletPoints as string[])[i].length > config.maxLengths.bulletPointLength) {
        errors.push(`Bullet ${i + 1} exceeds ${config.maxLengths.bulletPointLength} chars`);
      }
    }
    if (config.requirements.seoTags && (input.seoTags as string[]).length === 0) {
      errors.push("SEO tags required for this platform");
    }

    return {
      success: true,
      data: {
        valid: errors.length === 0,
        errors,
        platform: input.platform,
        config,
      },
      summary: errors.length === 0
        ? `Listing is valid for ${input.platform}. ✓`
        : `Listing has ${errors.length} issues: ${errors.join("; ")}`,
    };
  },
});
