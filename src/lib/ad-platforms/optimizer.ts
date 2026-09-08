import type { AdCampaign } from "@/lib/data/ad-campaigns";

export interface OptimizerRecommendation {
  type: "scale_up" | "scale_down" | "pause" | "reallocate" | "new_test";
  campaignId: string;
  campaignName: string;
  currentBudget: number;
  recommendedBudget: number;
  reason: string;
  expectedImpact: {
    roasChange: number;
    revenueChange: number;
    confidence: number;
  };
}

const RULES = [
  {
    id: "high_roas_low_spend",
    check: (c: AdCampaign) => c.metrics.roas > 3 && c.status === "active" && c.metrics.spend < c.dailyBudget * 0.5 && c.metrics.clicks > 20,
    generate: (c: AdCampaign): OptimizerRecommendation => ({
      type: "scale_up",
      campaignId: c.id,
      campaignName: c.name,
      currentBudget: c.dailyBudget,
      recommendedBudget: +(c.dailyBudget * 1.2).toFixed(2),
      reason: `ROAS of ${c.metrics.roas}x exceeds 3x target with budget underutilized (${((c.metrics.spend / c.dailyBudget) * 100).toFixed(0)}% used). Scaling up 20%.`,
      expectedImpact: { roasChange: 0.3, revenueChange: +(c.metrics.revenue * 0.2).toFixed(2), confidence: 0.8 },
    }),
  },
  {
    id: "declining_roas",
    check: (c: AdCampaign) => c.metrics.roas > 0 && c.metrics.roas < 1.5 && c.metrics.spend > 50 && c.status === "active",
    generate: (c: AdCampaign): OptimizerRecommendation => ({
      type: "scale_down",
      campaignId: c.id,
      campaignName: c.name,
      currentBudget: c.dailyBudget,
      recommendedBudget: +(c.dailyBudget * 0.7).toFixed(2),
      reason: `ROAS of ${c.metrics.roas}x is below 1.5x target. Reducing budget by 30% to limit losses.`,
      expectedImpact: { roasChange: 0.2, revenueChange: -(c.metrics.revenue * 0.1).toFixed(2) as unknown as number, confidence: 0.7 },
    }),
  },
  {
    id: "no_conversions",
    check: (c: AdCampaign) => c.metrics.conversions === 0 && c.metrics.spend > 50 && c.status === "active",
    generate: (c: AdCampaign): OptimizerRecommendation => ({
      type: "pause",
      campaignId: c.id,
      campaignName: c.name,
      currentBudget: c.dailyBudget,
      recommendedBudget: 0,
      reason: `No conversions after $${c.metrics.spend.toFixed(2)} spend. Pausing to prevent further losses.`,
      expectedImpact: { roasChange: 0, revenueChange: 0, confidence: 0.9 },
    }),
  },
  {
    id: "losing_money",
    check: (c: AdCampaign) => c.metrics.roas > 0 && c.metrics.roas < 1 && c.metrics.spend > 100 && c.status === "active",
    generate: (c: AdCampaign): OptimizerRecommendation => ({
      type: "scale_down",
      campaignId: c.id,
      campaignName: c.name,
      currentBudget: c.dailyBudget,
      recommendedBudget: +(c.dailyBudget * 0.5).toFixed(2),
      reason: `ROAS of ${c.metrics.roas}x means losing money on every dollar spent. Cutting budget by 50%.`,
      expectedImpact: { roasChange: 0.5, revenueChange: -(c.metrics.revenue * 0.2).toFixed(2) as unknown as number, confidence: 0.85 },
    }),
  },
  {
    id: "budget_headroom",
    check: (c: AdCampaign) => c.metrics.roas > 2 && c.metrics.roas <= 3 && c.status === "active" && c.metrics.spend >= c.dailyBudget * 0.9,
    generate: (c: AdCampaign): OptimizerRecommendation => ({
      type: "scale_up",
      campaignId: c.id,
      campaignName: c.name,
      currentBudget: c.dailyBudget,
      recommendedBudget: +(c.dailyBudget * 1.15).toFixed(2),
      reason: `ROAS of ${c.metrics.roas}x with budget nearly exhausted (${((c.metrics.spend / c.dailyBudget) * 100).toFixed(0)}% used). Adding 15% headroom.`,
      expectedImpact: { roasChange: 0.1, revenueChange: +(c.metrics.revenue * 0.15).toFixed(2), confidence: 0.75 },
    }),
  },
];

export function generateRecommendations(campaigns: AdCampaign[]): OptimizerRecommendation[] {
  const recommendations: OptimizerRecommendation[] = [];

  for (const campaign of campaigns) {
    for (const rule of RULES) {
      if (rule.check(campaign)) {
        recommendations.push(rule.generate(campaign));
        break;
      }
    }
  }

  return recommendations;
}
