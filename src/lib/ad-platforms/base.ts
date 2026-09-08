export interface AdPlatformMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  roas: number;
  cpc: number;
  ctr: number;
  conversionRate: number;
}

export interface AdPlatformCampaign {
  platformCampaignId: string;
  name: string;
  status: "active" | "paused" | "completed" | "draft";
  dailyBudget: number;
  metrics: AdPlatformMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface AdPlatformAdapter {
  platform: "facebook" | "google";
  getCampaigns(accessToken: string, accountId: string): Promise<AdPlatformCampaign[]>;
  getCampaignMetrics(accessToken: string, accountId: string, campaignId: string): Promise<AdPlatformMetrics>;
  createCampaign(accessToken: string, accountId: string, config: {
    name: string;
    dailyBudget: number;
    targeting?: Record<string, unknown>;
  }): Promise<string>;
  pauseCampaign(accessToken: string, accountId: string, campaignId: string): Promise<void>;
  resumeCampaign(accessToken: string, accountId: string, campaignId: string): Promise<void>;
  updateBudget(accessToken: string, accountId: string, campaignId: string, dailyBudget: number): Promise<void>;
}

export function computeMetrics(data: {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
}): AdPlatformMetrics {
  const { impressions, clicks, conversions, spend, revenue } = data;
  return {
    impressions,
    clicks,
    conversions,
    spend,
    revenue,
    roas: spend > 0 ? +(revenue / spend).toFixed(2) : 0,
    cpc: clicks > 0 ? +(spend / clicks).toFixed(2) : 0,
    ctr: impressions > 0 ? +((clicks / impressions) * 100).toFixed(2) : 0,
    conversionRate: clicks > 0 ? +((conversions / clicks) * 100).toFixed(2) : 0,
  };
}
