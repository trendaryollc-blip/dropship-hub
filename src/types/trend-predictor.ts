export type TrendPlatform = "tiktok" | "instagram" | "twitter" | "google_trends" | "amazon_movers" | "reddit";

export type TrendDirection = "rising" | "peaking" | "stable" | "declining";

export type PredictionConfidence = "high" | "medium" | "low";

export interface TrendSignal {
  id: string;
  platform: TrendPlatform;
  keyword: string;
  category: string;
  volume: number;
  previousVolume: number;
  growthRate: number;
  direction: TrendDirection;
  velocity: number;
  acceleration: number;
  saturationLevel: number;
  fetchedAt: string;
}

export interface TrendPrediction {
  id: string;
  productIdea: string;
  category: string;
  trendScore: number;
  confidence: PredictionConfidence;
  direction: TrendDirection;
  predictedPeak: string;
  timeToPeak: string;
  saturationRisk: number;
  competitionLevel: "low" | "medium" | "high" | "very_high";
  reasoning: string;
  signals: TrendSignal[];
  relatedKeywords: string[];
  suggestedPlatforms: string[];
  estimatedMargin: number;
  createdAt: string;
}

export interface RisingStar {
  id: string;
  productKeyword: string;
  category: string;
  growthVelocity: number;
  competitionScore: number;
  opportunityScore: number;
  currentVolume: number;
  peakVolume?: number;
  platforms: TrendPlatform[];
  firstSeen: string;
  lastUpdated: string;
  status: "emerging" | "rising" | "hot" | "peaking" | "saturated";
  reasoning: string;
}

export interface TrendAlert {
  id: string;
  type: "rising_star" | "peak_warning" | "saturation_alert" | "new_trend" | "volume_spike";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  keyword?: string;
  category?: string;
  read: boolean;
  createdAt: string;
}

export interface TrendDashboard {
  activeTrends: number;
  risingStars: number;
  predictionsToday: number;
  alertsUnread: number;
  topCategories: { category: string; count: number; avgGrowth: number }[];
  recentPredictions: TrendPrediction[];
  recentRisingStars: RisingStar[];
  alerts: TrendAlert[];
}

export interface TrendAnalysisRequest {
  keyword: string;
  category?: string;
  platforms?: TrendPlatform[];
  timeframe?: "7d" | "30d" | "90d";
}

export interface TrendAnalysisResponse {
  signals: TrendSignal[];
  prediction: TrendPrediction;
  risingStars: RisingStar[];
  relatedTrends: { keyword: string; growth: number; platform: TrendPlatform }[];
  analysisTime: number;
  provider: string;
}

export interface TrendWatchlistEntry {
  id: string;
  keyword: string;
  category: string;
  addedAt: string;
  lastChecked?: string;
  alertOnRising: boolean;
  alertOnPeak: boolean;
  alertOnSaturation: boolean;
}
