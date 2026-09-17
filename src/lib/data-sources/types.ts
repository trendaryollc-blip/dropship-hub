import type { TrendPlatform, TrendDirection, TrendSignal } from "@/types/trend-predictor";

export interface DataSourceConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout: number;
  retries: number;
}

export interface DataSourceResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  source: TrendPlatform;
  fetchedAt: string;
  cached: boolean;
}

export interface GoogleTrendsData {
  keyword: string;
  interestOverTime: { date: string; value: number }[];
  relatedQueries: { query: string; value: number; type: "rising" | "top" }[];
  relatedTopics: { title: string; type: string; value: number }[];
  interestByRegion: { region: string; value: number }[];
  timeframe: string;
}

export interface AmazonProductData {
  keyword: string;
  asin: string;
  title: string;
  price: number;
  reviewCount: number;
  rating: number;
  bsr: number;
  bsrHistory: { date: string; rank: number }[];
  sellerCount: number;
  monthlySales: number;
}

export interface SocialSignalData {
  platform: TrendPlatform;
  keyword: string;
  volume: number;
  growthRate: number;
  engagementRate: number;
  topPosts: { text: string; engagement: number; url: string }[];
  fetchedAt: string;
}

export interface AggregatedSignal {
  keyword: string;
  category: string;
  platform: TrendPlatform;
  volume: number;
  previousVolume: number;
  growthRate: number;
  direction: TrendDirection;
  velocity: number;
  acceleration: number;
  saturationLevel: number;
  confidence: number;
  sources: string[];
  fetchedAt: string;
}

export interface TrendCacheEntry {
  key: string;
  data: unknown;
  expiresAt: number;
}

export type TimeframeOption = "7d" | "30d" | "90d";

export interface TrendFetchOptions {
  keyword: string;
  category?: string;
  platforms?: TrendPlatform[];
  timeframe?: TimeframeOption;
  geo?: string;
}
