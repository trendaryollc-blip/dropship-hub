import type { AdPlatformAdapter, AdPlatformCampaign, AdPlatformMetrics } from "./base";
import { computeMetrics } from "./base";

const GOOGLE_ADS_API = "https://googleads.googleapis.com/v17";

interface GACampaignResponse {
  campaign?: {
    id: string;
    name: string;
    status: string;
    campaignBudget: string;
  };
  metrics?: {
    impressions: string;
    clicks: string;
    costMicros: string;
    conversions: string;
    ctr: string;
    averageCpc: string;
    conversionRate: string;
  };
}

function mapGAStatus(status: string): AdPlatformCampaign["status"] {
  const s = status.toUpperCase();
  if (s === "ENABLED") return "active";
  if (s === "PAUSED") return "paused";
  if (s === "REMOVED") return "completed";
  return "draft";
}

export const googleAdapter: AdPlatformAdapter = {
  platform: "google",

  async getCampaigns(accessToken: string, accountId: string): Promise<AdPlatformCampaign[]> {
    const customerId = accountId.replace("-", "");
    const query = `SELECT campaign.id, campaign.name, campaign.status, campaign.campaign_budget, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc FROM campaign WHERE campaign.status != 'REMOVED' LIMIT 50`;

    const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Google Ads API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }

    const data = await res.json();
    const results: GACampaignResponse[] = data[0]?.results || [];

    return results.map((r) => {
      const campaign = (r.campaign ?? {}) as NonNullable<GACampaignResponse["campaign"]>;
      const metrics = (r.metrics ?? {}) as NonNullable<GACampaignResponse["metrics"]>;
      const spend = parseFloat(metrics.costMicros) / 1_000_000;
      const impressions = parseInt(metrics.impressions, 10);
      const clicks = parseInt(metrics.clicks, 10);
      const conversions = parseFloat(metrics.conversions);

      const now = new Date().toISOString();
      return {
        platformCampaignId: campaign.id,
        name: campaign.name || "Untitled",
        status: mapGAStatus(campaign.status || ""),
        dailyBudget: 0,
        metrics: computeMetrics({ impressions, clicks, conversions, spend, revenue: 0 }),
        createdAt: now,
        updatedAt: now,
      };
    });
  },

  async getCampaignMetrics(accessToken: string, accountId: string, campaignId: string): Promise<AdPlatformMetrics> {
    const customerId = accountId.replace("-", "");
    const query = `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc, metrics.conversion_rate FROM campaign WHERE campaign.id = ${campaignId}`;

    const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Google Ads API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }

    const data = await res.json();
    const result: GACampaignResponse = data[0]?.results?.[0];
    const metrics = result?.metrics;

    if (!metrics) {
      return computeMetrics({ impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
    }

    const spend = parseFloat(metrics.costMicros || "0") / 1_000_000;
    const impressions = parseInt(metrics.impressions || "0", 10);
    const clicks = parseInt(metrics.clicks || "0", 10);
    const conversions = parseFloat(metrics.conversions || "0");

    return computeMetrics({ impressions, clicks, conversions, spend, revenue: 0 });
  },

  async createCampaign(accessToken: string, accountId: string, config: {
    name: string;
    dailyBudget: number;
    targeting?: Record<string, unknown>;
  }): Promise<string> {
    const customerId = accountId.replace("-", "");
    const _budgetAmountMicros = Math.round(config.dailyBudget * 1_000_000);

    const _operations = [
      {
        create: {
          name: config.name,
          status: "PAUSED",
          campaignBudget: "",
          biddingStrategyType: "MAXIMIZE_CONVERSIONS",
        },
      },
    ];

    const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/campaigns:mutate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operations: [{
          create: {
            resourceNames: [],
            name: config.name,
            status: "PAUSED",
            campaignBudget: "",
          },
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Google Ads API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }

    const data = await res.json();
    return data.results?.[0]?.resourceName?.split("/").pop() || "";
  },

  async pauseCampaign(accessToken: string, accountId: string, campaignId: string): Promise<void> {
    const customerId = accountId.replace("-", "");
    const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/campaigns:mutate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operations: [{
          updateMask: "status",
          update: {
            resourceName: `customers/${customerId}/campaigns/${campaignId}`,
            status: "PAUSED",
          },
        }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Google Ads API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }
  },

  async resumeCampaign(accessToken: string, accountId: string, campaignId: string): Promise<void> {
    const customerId = accountId.replace("-", "");
    const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/campaigns:mutate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operations: [{
          updateMask: "status",
          update: {
            resourceName: `customers/${customerId}/campaigns/${campaignId}`,
            status: "ENABLED",
          },
        }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Google Ads API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }
  },

  async updateBudget(accessToken: string, accountId: string, campaignId: string, dailyBudget: number): Promise<void> {
    const customerId = accountId.replace("-", "");
    const budgetAmountMicros = Math.round(dailyBudget * 1_000_000);
    const res = await fetch(`${GOOGLE_ADS_API}/customers/${customerId}/campaigns:mutate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operations: [{
          updateMask: "campaign_budget.amount_micros",
          update: {
            resourceName: `customers/${customerId}/campaigns/${campaignId}`,
            campaignBudget: `customers/${customerId}/campaignBudgets/${campaignId}`,
          },
        }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Google Ads API ${res.status}: ${JSON.stringify(err.error || err)}`);
    }
    void budgetAmountMicros;
  },
};
