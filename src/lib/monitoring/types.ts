export interface MonitoredProduct {
  id?: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  source: string;
  sourceUrl: string;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  lastChecked: string;
  priceHistory: PriceHistoryEntry[];
  stockStatus: "in_stock" | "out_of_stock" | "unknown";
  alerts: PriceAlert[];
  repricingRule?: RepricingRule;
  priceDropThreshold?: number;
  competitorUrls?: string[];
  autoDelist?: boolean;
  storeConnections?: StoreConnectionRef[];
}

export interface PriceHistoryEntry {
  date: string;
  price: number;
  source?: "scrape" | "cj_api" | "manual" | "reprice";
}

export interface PriceAlert {
  id: string;
  type: "price_drop" | "price_increase" | "out_of_stock" | "back_in_stock" | "competitor_undercut";
  message: string;
  oldPrice?: number;
  newPrice?: number;
  createdAt: string;
  read: boolean;
}

export interface RepricingRule {
  enabled: boolean;
  type: "maintain_margin" | "undercut" | "fixed_price";
  value: number;
}

export interface StoreConnectionRef {
  storeId: string;
  platform: "shopify" | "woocommerce";
  storeUrl: string;
  apiKey: string;
  apiSecret: string;
}

export interface CompetitorSnapshot {
  url: string;
  price: number | null;
  inStock: boolean;
  scrapedAt: string;
}

export interface MonitoringMetrics {
  totalMonitored: number;
  inStock: number;
  outOfStock: number;
  unknown: number;
  avgPriceChangePercent: number;
  totalAlerts: number;
  unreadAlerts: number;
  priceDrops24h: number;
  priceIncreases24h: number;
  stockOutEvents24h: number;
  lastCheckTime: string | null;
}

export interface RepriceAuditEntry {
  id: string;
  productId: string;
  productTitle: string;
  oldSellPrice: number;
  newSellPrice: number;
  supplierPrice: number;
  ruleType: string;
  ruleValue: number;
  storeUpdated: boolean;
  storePlatform?: string;
  error?: string;
  createdAt: string;
}

export interface NotificationPayload {
  type: "price_drop" | "price_increase" | "out_of_stock" | "back_in_stock" | "competitor_undercut";
  productTitle: string;
  productId: string;
  oldPrice?: number;
  newPrice?: number;
  message: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export const DEFAULT_PRICE_DROP_THRESHOLD = 5;

export const MAX_PRICE_HISTORY_DAYS = 90;
