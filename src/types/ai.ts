export interface ProductRecommendation {
  id: string;
  title: string;
  category: string;
  sourcePrice: number;
  suggestedSellPrice: number;
  estimatedMargin: number;
  confidence: number;
  reason: string;
  matchType: string;
  riskLevel: string;
  competitionLevel: string;
  matchScore: number;
  reasoning: string;
  tags: string[];
}

export interface ForecastPoint {
  date: string;
  actual: number | null;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface RevenueForecast {
  forecast: ForecastPoint[];
  summary: {
    currentTrend: "growing" | "declining" | "stable";
    projectedWeeklyRevenue: number;
    projectedMonthlyRevenue: number;
    confidenceLevel: "high" | "medium" | "low";
    avgDailyRevenue: number;
    bestDay: string;
    worstDay: string;
    growthRate: number;
  };
  insights: string[];
  generatedAt?: string;
}

export interface ReportSection {
  title: string;
  content: string;
  metric?: string;
  trend?: "up" | "down" | "stable";
  icon: string;
}

export interface BusinessReport {
  period: "weekly" | "monthly";
  dateRange: { start: string; end: string };
  generatedAt: string;
  summary: string;
  sections: ReportSection[];
  healthScore: number;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

export interface CompetitorChange {
  id: string;
  competitorName: string;
  changeType: string;
  severity: string;
  product: string;
  oldValue: string;
  newValue: string;
  impact: string;
  recommendation: string;
  detectedAt: string;
}

export interface CompetitorSummary {
  totalChanges: number;
  critical: number;
  warnings: number;
  opportunities: number;
}
