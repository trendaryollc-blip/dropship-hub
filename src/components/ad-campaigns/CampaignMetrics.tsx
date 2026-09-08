"use client";

import { DollarSign, MousePointer, ShoppingCart, TrendingUp, Eye, BarChart3 } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";

interface CampaignMetrics {
  totalSpend: number;
  totalRevenue: number;
  totalClicks: number;
  totalConversions: number;
  totalImpressions: number;
  avgROAS: number;
  avgCPC: number;
  avgCTR: number;
  avgConversionRate: number;
  activeCampaigns: number;
  pausedCampaigns: number;
}

interface Campaign {
  id: string;
  status: string;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    roas: number;
    cpc: number;
    ctr: number;
    conversionRate: number;
  };
}

export default function CampaignMetrics() {
  const { data, isLoading } = useAPI<{ campaigns: Campaign[] }>("/api/ad-campaigns");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="glass rounded-2xl p-4 animate-pulse">
            <div className="h-3 bg-surface rounded w-1/2 mb-2" />
            <div className="h-6 bg-surface rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const campaigns = data?.campaigns || [];

  const metrics: CampaignMetrics = campaigns.reduce(
    (acc, c) => {
      acc.totalSpend += c.metrics.spend;
      acc.totalRevenue += c.metrics.revenue;
      acc.totalClicks += c.metrics.clicks;
      acc.totalConversions += c.metrics.conversions;
      acc.totalImpressions += c.metrics.impressions;
      if (c.status === "active") acc.activeCampaigns++;
      if (c.status === "paused") acc.pausedCampaigns++;
      return acc;
    },
    {
      totalSpend: 0,
      totalRevenue: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalImpressions: 0,
      avgROAS: 0,
      avgCPC: 0,
      avgCTR: 0,
      avgConversionRate: 0,
      activeCampaigns: 0,
      pausedCampaigns: 0,
    }
  );

  metrics.avgROAS = metrics.totalSpend > 0 ? metrics.totalRevenue / metrics.totalSpend : 0;
  metrics.avgCPC = metrics.totalClicks > 0 ? metrics.totalSpend / metrics.totalClicks : 0;
  metrics.avgCTR = metrics.totalImpressions > 0 ? (metrics.totalClicks / metrics.totalImpressions) * 100 : 0;
  metrics.avgConversionRate = metrics.totalClicks > 0 ? (metrics.totalConversions / metrics.totalClicks) * 100 : 0;

  const kpis = [
    { label: "Total Spend", value: `$${metrics.totalSpend.toFixed(0)}`, icon: DollarSign, color: "text-blue-400" },
    { label: "Total Revenue", value: `$${metrics.totalRevenue.toFixed(0)}`, icon: TrendingUp, color: "text-emerald-400" },
    { label: "Avg ROAS", value: `${metrics.avgROAS.toFixed(1)}x`, icon: BarChart3, color: metrics.avgROAS >= 2 ? "text-emerald-400" : "text-amber-400" },
    { label: "Total Clicks", value: metrics.totalClicks.toLocaleString(), icon: MousePointer, color: "text-purple-400" },
    { label: "Conversions", value: metrics.totalConversions.toLocaleString(), icon: ShoppingCart, color: "text-amber-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="glass rounded-2xl p-4 hover:border-accent/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
            <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
          </div>
          <p className="font-display text-lg font-bold text-foreground">{kpi.value}</p>
          {kpi.label === "Avg ROAS" && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] text-muted-foreground">{metrics.activeCampaigns} active</span>
              <span className="text-[9px] text-muted-foreground">&middot;</span>
              <span className="text-[9px] text-muted-foreground">{metrics.pausedCampaigns} paused</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
