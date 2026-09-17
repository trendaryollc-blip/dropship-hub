export interface ScrapedProductData {
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  specifications: Record<string, string>;
  category: string;
  brand: string;
  rating: number;
  reviewCount: number;
  source: string;
  sourceUrl: string;
  supplierName: string;
  inStock: boolean;
  shippingInfo?: string;
  variants?: { name: string; price: number; inStock: boolean }[];
}

export interface CompetitorListing {
  rank: number;
  title: string;
  price: number;
  image: string;
  rating: number;
  reviewCount: number;
  platform: string;
  url: string;
  bulletPoints: string[];
  keywords: string[];
  listingAge?: string;
  salesEstimate?: number;
}

export interface CompetitorIntelligence {
  keyword: string;
  platform: string;
  totalResults: number;
  competitors: CompetitorListing[];
  marketInsights: MarketInsights;
  generatedAt: string;
}

export interface MarketInsights {
  avgPrice: number;
  priceRange: { min: number; max: number };
  medianPrice: number;
  avgRating: number;
  avgReviewCount: number;
  topKeywords: { keyword: string; frequency: number }[];
  competitionLevel: "low" | "medium" | "high" | "very-high";
  saturationScore: number;
  recommendedPrice: number;
  priceDistribution: { range: string; count: number; percentage: number }[];
  opportunityScore: number;
  insights: string[];
}

export interface ListingPreviewData {
  platform: string;
  title: string;
  description: string;
  bulletPoints: string[];
  price: number;
  images: string[];
  rating?: number;
  reviewCount?: number;
  brand?: string;
  specifications?: Record<string, string>;
  seoScore: number;
  algorithmCompliance: AlgorithmCheck[];
}

export interface AlgorithmCheck {
  rule: string;
  passed: boolean;
  impact: "critical" | "high" | "medium" | "low";
  suggestion?: string;
}

export interface BulkImportItem {
  id: string;
  url?: string;
  csvRow?: number;
  status: "pending" | "importing" | "ready" | "error";
  data?: ScrapedProductData;
  error?: string;
}

export interface SmartAutofillSuggestion {
  field: string;
  value: string;
  confidence: number;
  source: "ai" | "scraped" | "pattern" | "competitor";
}
