export type PriceAdjustmentStrategy = "match_lowest" | "stay_below" | "maintain_margin" | "undercut_percent" | "fixed";

export type PriceRuleStatus = "active" | "paused" | "triggered" | "error";

export interface PriceRule {
  id: string;
  productTitle: string;
  productImage?: string;
  productUrl?: string;
  myPrice: number;
  cost: number;
  floorPrice: number;
  minMargin: number;
  strategy: PriceAdjustmentStrategy;
  strategyConfig: {
    undercutPercent?: number;
    belowPercent?: number;
    targetMargin?: number;
    maxIncrease?: number;
    maxDecrease?: number;
  };
  platforms: string[];
  competitorUrls: string[];
  status: PriceRuleStatus;
  lastChecked?: string;
  lastAdjusted?: string;
  createdAt: string;
}

export interface CompetitorPrice {
  id: string;
  ruleId: string;
  platform: string;
  seller: string;
  price: number;
  previousPrice?: number;
  url: string;
  shipping: number;
  totalLanded: number;
  inStock: boolean;
  lastSeen: string;
}

export interface PriceAdjustmentLog {
  id: string;
  ruleId: string;
  productTitle: string;
  previousPrice: number;
  newPrice: number;
  reason: string;
  strategy: PriceAdjustmentStrategy;
  competitorPrice?: number;
  marginBefore: number;
  marginAfter: number;
  autoApplied: boolean;
  createdAt: string;
}

export interface PriceWarDashboard {
  activeRules: number;
  triggeredToday: number;
  avgMargin: number;
  totalSavings: number;
  rules: PriceRule[];
  recentAdjustments: PriceAdjustmentLog[];
  competitorAlerts: CompetitorAlert[];
}

export interface CompetitorAlert {
  id: string;
  ruleId: string;
  type: "price_drop" | "price_increase" | "out_of_stock" | "new_competitor" | "below_floor";
  message: string;
  competitorPrice: number;
  myPrice: number;
  severity: "low" | "medium" | "high";
  createdAt: string;
}

export interface PriceWarSettings {
  enabled: boolean;
  checkIntervalMinutes: number;
  autoApply: boolean;
  maxDailyAdjustments: number;
  notifyOnAdjustment: boolean;
  notifyOnFloorBreach: boolean;
}

export interface PriceWarStats {
  totalRules: number;
  activeRules: number;
  pausedRules: number;
  triggeredToday: number;
  totalAdjustments: number;
  avgMarginMaintained: number;
  totalSavingsFromAdjustments: number;
  lastFullScan?: string;
}
