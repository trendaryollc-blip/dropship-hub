"use client";

import { useState } from "react";
import { Play, Pause, RefreshCw, DollarSign, MousePointer, ShoppingCart, TrendingUp, Loader2 } from "lucide-react";
import { useMutation, revalidate } from "@/hooks/useAPI";

interface Campaign {
  id: string;
  platform: string;
  name: string;
  status: string;
  productTitle: string;
  dailyBudget: number;
  startDate: string;
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

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  paused: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
  completed: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
  draft: { bg: "bg-gray-500/10", text: "text-gray-400", dot: "bg-gray-400" },
};

const platformBadge: Record<string, { bg: string; text: string }> = {
  facebook: { bg: "bg-blue-500/10", text: "text-blue-400" },
  google: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  manual: { bg: "bg-purple-500/10", text: "text-purple-400" },
};

export default function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { trigger: updateCampaign, isMutating } = useMutation(`/api/ad-campaigns/${campaign.id}`);
  const { trigger: syncCampaign } = useMutation("/api/ad-campaigns/sync");
  const [syncing, setSyncing] = useState(false);

  const sc = statusColors[campaign.status] || statusColors.draft;
  const pb = platformBadge[campaign.platform] || platformBadge.manual;
  const m = campaign.metrics;

  const toggleStatus = async () => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    await updateCampaign({ body: { status: newStatus }, method: "PATCH" });
    revalidate("/api/ad-campaigns");
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncCampaign({ body: { campaignId: campaign.id, platform: campaign.platform } });
      revalidate("/api/ad-campaigns");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 hover:border-accent/10 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-display text-sm font-semibold text-foreground truncate">{campaign.name}</h4>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${pb.bg} ${pb.text}`}>
              {campaign.platform}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{campaign.productTitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${sc.bg} ${sc.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {campaign.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <DollarSign className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs font-bold text-foreground">${m.spend.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground">Spend</p>
        </div>
        <div className="text-center">
          <MousePointer className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs font-bold text-foreground">{m.clicks}</p>
          <p className="text-[9px] text-muted-foreground">Clicks</p>
        </div>
        <div className="text-center">
          <ShoppingCart className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs font-bold text-foreground">{m.conversions}</p>
          <p className="text-[9px] text-muted-foreground">Conv.</p>
        </div>
        <div className="text-center">
          <TrendingUp className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
          <p className={`text-xs font-bold ${m.roas >= 2 ? "text-emerald-400" : m.roas >= 1 ? "text-amber-400" : "text-red-400"}`}>
            {m.roas.toFixed(1)}x
          </p>
          <p className="text-[9px] text-muted-foreground">ROAS</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>CTR: {m.ctr.toFixed(1)}%</span>
          <span>CPC: ${m.cpc.toFixed(2)}</span>
          <span>CR: {m.conversionRate.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-1">
          {campaign.platform !== "manual" && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface/80 text-muted-foreground hover:text-foreground transition-all"
            >
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </button>
          )}
          <button
            onClick={toggleStatus}
            disabled={isMutating}
            className="p-1.5 rounded-lg bg-surface hover:bg-surface/80 text-muted-foreground hover:text-foreground transition-all"
          >
            {campaign.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}
