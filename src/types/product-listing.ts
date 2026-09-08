export type PlatformType = "amazon" | "shopify" | "etsy" | "ebay" | "walmart";

export interface ProductInput {
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  specifications: Record<string, string>;
  supplierUrl?: string;
  supplierName?: string;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
}

export interface PlatformListingConfig {
  platform: PlatformType;
  maxLengths: {
    title: number;
    description: number;
    bulletPoints: number;
    bulletPointLength: number;
  };
  requirements: {
    bulletPoints: number;
    seoTags: boolean;
    backendKeywords: boolean;
    storyDescription: boolean;
  };
}

export interface GeneratedListing {
  id: string;
  platform: PlatformType;
  title: string;
  description: string;
  bulletPoints: string[];
  seoTags: string[];
  backendKeywords?: string[];
  storyDescription?: string;
  characterCounts: {
    title: number;
    description: number;
  };
  optimizationScore: number;
  generatedAt: string;
}

export interface ListingGenerationRequest {
  product: ProductInput;
  platform: PlatformType;
  tone?: "professional" | "casual" | "luxury" | "budget" | "handmade";
  targetAudience?: string;
  competitorListings?: { title: string; price: number }[];
}

export interface ListingGenerationResponse {
  listing: GeneratedListing;
  alternatives: {
    title: string;
    description: string;
    bulletPoints: string[];
  }[];
  keywordSuggestions: { keyword: string; volume: string; competition: string }[];
  generationTime: number;
  provider: string;
}

export interface SavedListing extends GeneratedListing {
  productTitle: string;
  productImage?: string;
  productPrice: number;
  notes?: string;
  usedAt?: string;
  createdAt: string;
}

export interface ListingStats {
  totalGenerated: number;
  byPlatform: Record<PlatformType, number>;
  avgOptimizationScore: number;
  lastGenerated?: string;
}
