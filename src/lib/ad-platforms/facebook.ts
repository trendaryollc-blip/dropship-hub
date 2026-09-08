import type { AdPlatformAdapter, AdPlatformCampaign, AdPlatformMetrics } from "./base";
import { computeMetrics } from "./base";

const FB_API_VERSION = "v19.0";
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

interface FBCampaignResponse {
  id: string;
  name: string;
  status: string;
  daily_budget: string;
  insights?: {
    data: Array<{
      impressions: string;
      clicks: string;
      actions?: Array<{ action_type: string; value: string }>;
      spend: string;
      ctr: string;
      cpc: string;
    }>;
  };
}

function mapFBStatus(status: string): AdPlatformCampaign["status"] {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "active";
  if (s === "PAUSED") return "paused";
  if (s === "ARCHIVED") return "completed";
  return "draft";
}

export const facebookAdapter: AdPlatformAdapter = {
  platform: "facebook",

  async getCampaigns(accessToken: string, accountId: string): Promise<AdPlatformCampaign[]> {
    const url = `${FB_BASE_URL}/act_${accountId}/campaigns?fields=id,name,status,daily_budget,insights{impressions,clicks,actions,spend,ctr,cpc}&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Facebook API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }
    const data = await res.json();
    const campaigns: FBCampaignResponse[] = data.data || [];

    return campaigns.map((c) => {
      const insight = c.insights?.data?.[0];
      const impressions = insight ? parseInt(insight.impressions || "0", 10) : 0;
      const clicks = insight ? parseInt(insight.clicks || "0", 10) : 0;
      const spend = insight ? parseFloat(insight.spend || "0") : 0;
      const conversions = insight?.actions
        ? insight.actions.filter((a) => ["offsite_conversion", "purchase", "lead"].includes(a.action_type)).reduce((sum, a) => sum + parseInt(a.value || "0", 10), 0)
        : 0;

      const now = new Date().toISOString();
      return {
        platformCampaignId: c.id,
        name: c.name,
        status: mapFBStatus(c.status),
        dailyBudget: parseInt(c.daily_budget || "0", 10) / 100,
        metrics: computeMetrics({ impressions, clicks, conversions, spend, revenue: 0 }),
        createdAt: now,
        updatedAt: now,
      };
    });
  },

  async getCampaignMetrics(accessToken: string, accountId: string, campaignId: string): Promise<AdPlatformMetrics> {
    const url = `${FB_BASE_URL}/act_${accountId}/insights?level=campaign&filtering=[{"field":"campaign.id","operator":"EQUAL","value":"${campaignId}"}]&fields=impressions,clicks,actions,spend,ctr,cpc&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Facebook API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }
    const data = await res.json();
    const insight = data.data?.[0];

    if (!insight) {
      return computeMetrics({ impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
    }

    const impressions = parseInt(insight.impressions || "0", 10);
    const clicks = parseInt(insight.clicks || "0", 10);
    const spend = parseFloat(insight.spend || "0");
    const conversions = insight.actions
      ? insight.actions.filter((a: { action_type: string }) => ["offsite_conversion", "purchase", "lead"].includes(a.action_type)).reduce((sum: number, a: { value: string }) => sum + parseInt(a.value || "0", 10), 0)
      : 0;

    return computeMetrics({ impressions, clicks, conversions, spend, revenue: 0 });
  },

  async createCampaign(accessToken: string, accountId: string, config: {
    name: string;
    dailyBudget: number;
    targeting?: Record<string, unknown>;
  }): Promise<string> {
    const url = `${FB_BASE_URL}/act_${accountId}/campaigns`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: config.name,
        objective: "OUTCOME_SALES",
        status: "PAUSED",
        daily_budget: Math.round(config.dailyBudget * 100),
        special_ad_categories: [],
        access_token: accessToken,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Facebook API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }
    const data = await res.json();
    return data.id;
  },

  async pauseCampaign(accessToken: string, accountId: string, campaignId: string): Promise<void> {
    const url = `${FB_BASE_URL}/${campaignId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAUSED", access_token: accessToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Facebook API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }
  },

  async resumeCampaign(accessToken: string, _accountId: string, campaignId: string): Promise<void> {
    const url = `${FB_BASE_URL}/${campaignId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE", access_token: accessToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Facebook API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }
  },

  async updateBudget(accessToken: string, _accountId: string, campaignId: string, dailyBudget: number): Promise<void> {
    const url = `${FB_BASE_URL}/${campaignId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_budget: Math.round(dailyBudget * 100), access_token: accessToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Facebook API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }
  },
};
