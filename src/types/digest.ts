export interface DigestMetrics {
  orders: number;
  revenue: number;
  profit: number;
  stockAlerts: number;
  supplierDelays: number;
}

export interface DigestAlert {
  type: "stock" | "supplier" | "adSpend" | "trend";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface WeeklyTrend {
  direction: "up" | "down" | "stable";
  percentage: number;
  insight: string;
}

export interface TopProduct {
  name: string;
  revenue: number;
  units: number;
}

export interface TopCampaign {
  name: string;
  roas: number;
  spend: number;
}

export interface DigestData {
  date: string;
  summary: string;
  metrics: DigestMetrics;
  previousMetrics?: DigestMetrics;
  alerts: DigestAlert[];
  recommendations: string[];
  weeklyTrend: WeeklyTrend;
  topProducts?: TopProduct[];
  topCampaigns?: TopCampaign[];
}

export interface DigestPreferences {
  autoGenerate: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  preferredTime: string;
  emailAddress: string;
}
