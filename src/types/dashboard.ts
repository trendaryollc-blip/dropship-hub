export interface TickerItem {
  name: string;
  platform: string;
  price: number;
  change: number;
  sparkline: number[];
}

export interface AIRadarScores {
  margin: number;
  demand: number;
  competition: number;
  trend: number;
  supplier: number;
}

export interface AIDailyPick {
  title: string;
  category: string;
  image: string;
  description: string;
  radarScores: AIRadarScores;
  sourcePrice: number;
  sellPrice: number;
  margin: number;
  risk: "low" | "medium" | "high";
  reason: string;
  platform: string;
  ordersPerMonth: number;
  saturation: number;
  overallScore: number;
  earningsPreview: { profitPerOrder: number; ordersPerMonth: number; monthlyRevenue: number };
  reasonPoints: string[];
  expiresAt: string;
  yesterdayPick?: { title: string; result: string; up: boolean };
}

export interface RevenuePoint {
  date: string;
  value: number;
}

export interface RevenueStat {
  label: string;
  value: number;
  change: string;
  up: boolean;
  icon: string;
  color: string;
  prefix?: string;
  sparkline: number[];
}

export interface SmartAlert {
  id: string;
  type: "opportunity" | "risk" | "info" | "warning";
  title: string;
  description: string;
  action: string;
  actionHref: string;
  timestamp: string;
  read: boolean;
  confidence: number;
  aiAnalysis: string;
  sparkline: number[];
}

export interface AIBriefing {
  insights: string[];
  sentiment: number;
  sentimentLabel: string;
  opportunities: number;
  risks: number;
  trends: number;
  lastScan: string;
}

export interface MarketPulseCard {
  label: string;
  value: string;
  change: string;
  up: boolean;
  sparkline: number[];
  icon: string;
  color: string;
}

export interface QuickActionStat {
  label: string;
  description: string;
  href: string;
  color: string;
  stat: string;
  statLabel: string;
}

export interface NicheRadarScores {
  demand: number;
  profit: number;
  competition: number;
  trend: number;
  seasonality: number;
}

export interface NicheCard {
  name: string;
  category: string;
  scores: NicheRadarScores;
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C";
  productCount: number;
  avgMargin: number;
  growth: number;
  aiInsight: string;
  demandSparkline: number[] | null;
  topProduct: string;
}

export interface SupplierStatus {
  name: string;
  trustBadge: "gold" | "silver" | "bronze";
  responseTime: string;
  responseLevel: "fast" | "moderate" | "slow";
  completionRate: number;
  status: "online" | "busy" | "offline";
  rating: number;
  location: string;
}

export interface MissionBadge {
  name: string;
  icon: string;
  earned: boolean;
}

export interface DailyMission {
  challenge: string;
  xpReward: number;
  streak: number;
  badges: MissionBadge[];
  level: number;
  currentXP: number;
  nextLevelXP: number;
}

export interface HeatmapCategory {
  category: string;
  heat: number;
  productCount: number;
  avgMargin: number;
  trend: "up" | "down" | "stable";
  weeklyData: number[];
  topProduct: string;
  topProductMargin: number;
  aiInsight: string;
  velocity: number;
}

export interface TrendingProduct {
  name: string;
  platform: string;
  price: number;
  sellPrice: number;
  profit: number;
  margin: number;
  trend: number;
  sparkline: number[];
  confidence: number;
  whyTrending: string;
  demandLevel: "low" | "medium" | "high";
  competitionLevel: "low" | "medium" | "high";
  supplierReliability: number;
  monthlyVolume: number;
  shippingDays: string;
  sourceUrl: string;
  competitors: { name: string; price: number }[];
  listingSuggestion: { title: string; description: string };
}
