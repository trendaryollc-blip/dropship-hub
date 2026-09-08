import { describe, it, expect } from "vitest";
import { generateRecommendations } from "./optimizer";
import type { AdCampaign } from "@/lib/data/ad-campaigns";

function makeCampaign(overrides: Partial<AdCampaign>): AdCampaign {
  return {
    id: "test-id",
    platform: "manual",
    name: "Test Campaign",
    status: "active",
    productTitle: "Test Product",
    dailyBudget: 100,
    startDate: "2025-01-01",
    metrics: {
      impressions: 1000,
      clicks: 50,
      conversions: 5,
      spend: 75,
      revenue: 300,
      roas: 4,
      cpc: 1.5,
      ctr: 5,
      conversionRate: 10,
    },
    createdAt: {} as any,
    updatedAt: {} as any,
    ...overrides,
  };
}

describe("generateRecommendations", () => {
  it("scales up campaigns with high ROAS and low spend", () => {
    const campaigns = [makeCampaign({
      metrics: { impressions: 1000, clicks: 50, conversions: 5, spend: 30, revenue: 200, roas: 6.67, cpc: 0.6, ctr: 5, conversionRate: 10 },
    })];

    const recs = generateRecommendations(campaigns);
    expect(recs).toHaveLength(1);
    expect(recs[0].type).toBe("scale_up");
    expect(recs[0].recommendedBudget).toBe(120);
  });

  it("scales down campaigns with declining ROAS", () => {
    const campaigns = [makeCampaign({
      metrics: { impressions: 1000, clicks: 50, conversions: 2, spend: 80, revenue: 100, roas: 1.25, cpc: 1.6, ctr: 5, conversionRate: 4 },
    })];

    const recs = generateRecommendations(campaigns);
    expect(recs).toHaveLength(1);
    expect(recs[0].type).toBe("scale_down");
  });

  it("pauses campaigns with no conversions and high spend", () => {
    const campaigns = [makeCampaign({
      metrics: { impressions: 1000, clicks: 50, conversions: 0, spend: 100, revenue: 0, roas: 0, cpc: 2, ctr: 5, conversionRate: 0 },
    })];

    const recs = generateRecommendations(campaigns);
    expect(recs).toHaveLength(1);
    expect(recs[0].type).toBe("pause");
  });

  it("scales down campaigns losing money", () => {
    const campaigns = [makeCampaign({
      metrics: { impressions: 2000, clicks: 100, conversions: 3, spend: 150, revenue: 80, roas: 0.53, cpc: 1.5, ctr: 5, conversionRate: 3 },
    })];

    const recs = generateRecommendations(campaigns);
    expect(recs).toHaveLength(1);
    expect(recs[0].type).toBe("scale_down");
  });

  it("scales up campaigns with good ROAS and exhausted budget", () => {
    const campaigns = [makeCampaign({
      dailyBudget: 100,
      metrics: { impressions: 2000, clicks: 100, conversions: 10, spend: 95, revenue: 250, roas: 2.5, cpc: 0.95, ctr: 5, conversionRate: 10 },
    })];

    const recs = generateRecommendations(campaigns);
    expect(recs).toHaveLength(1);
    expect(recs[0].type).toBe("scale_up");
  });

  it("returns no recommendations for paused campaigns", () => {
    const campaigns = [makeCampaign({
      status: "paused",
      metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, roas: 0, cpc: 0, ctr: 0, conversionRate: 0 },
    })];

    const recs = generateRecommendations(campaigns);
    expect(recs).toHaveLength(0);
  });

  it("returns no recommendations for campaigns with no spend", () => {
    const campaigns = [makeCampaign({
      metrics: { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0, roas: 0, cpc: 0, ctr: 0, conversionRate: 0 },
    })];

    const recs = generateRecommendations(campaigns);
    expect(recs).toHaveLength(0);
  });

  it("generates recommendations for multiple campaigns", () => {
    const campaigns = [
      makeCampaign({
        id: "c1",
        name: "Winner",
        metrics: { impressions: 1000, clicks: 50, conversions: 5, spend: 30, revenue: 200, roas: 6.67, cpc: 0.6, ctr: 5, conversionRate: 10 },
      }),
      makeCampaign({
        id: "c2",
        name: "Loser",
        metrics: { impressions: 1000, clicks: 50, conversions: 0, spend: 80, revenue: 0, roas: 0, cpc: 1.6, ctr: 5, conversionRate: 0 },
      }),
    ];

    const recs = generateRecommendations(campaigns);
    expect(recs).toHaveLength(2);
    expect(recs.find((r) => r.campaignId === "c1")?.type).toBe("scale_up");
    expect(recs.find((r) => r.campaignId === "c2")?.type).toBe("pause");
  });
});
