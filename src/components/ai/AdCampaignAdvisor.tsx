"use client";

import { useState } from "react";
import { Megaphone, TrendingUp, TrendingDown, AlertTriangle, Zap, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";

interface CampaignAnalysis {
  name: string;
  adSpend: number;
  revenue: number;
  profit: number;
  roas: number;
  orders: number;
  costPerOrder: number;
  rating: "excellent" | "good" | "needs-work" | "stop";
  recommendation: string;
  optimizationTips: string[];
}

interface AdAdvisorResult {
  campaigns: CampaignAnalysis[];
  summary: {
    totalAdSpend: number;
    totalRevenue: number;
    overallROAS: number;
    bestCampaign: string;
    worstCampaign: string;
    budgetRecommendation: string;
  };
  insights: string[];
}

export default function AdCampaignAdvisor({ uid }: { uid: string }) {
  const [data, setData] = useState<AdAdvisorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    try {
      const json = await safeFetch<AdAdvisorResult>("/api/ai/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      setData(json);
    } catch (e) { if (process.env.NODE_ENV === "development") console.warn("[AdCampaignAdvisor] silently caught", e); }
    setLoading(false);
  };

  const ratingBadge = (rating: string) => {
    const styles: Record<string, string> = {
      excellent: "bg-emerald-500/20 text-emerald-400",
      good: "bg-blue-500/20 text-blue-400",
      "needs-work": "bg-yellow-500/20 text-yellow-400",
      stop: "bg-red-500/20 text-red-400",
    };
    const labels: Record<string, string> = {
      excellent: "Scale",
      good: "Profitable",
      "needs-work": "Optimize",
      stop: "Pause",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[rating] || ""}`}>
        {labels[rating] || rating}
      </span>
    );
  };

  return (
    <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-pink-400" />
          <span className="text-sm font-medium text-[#e0e0e0]">Ad Campaign Advisor</span>
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          className="text-xs px-3 py-1 rounded-lg bg-[#1a1a2e] text-[#a0a0b0] hover:text-[#e0e0e0] hover:bg-[#25253a] transition-all disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {!data && !loading && (
        <p className="text-xs text-[#606070]">Click analyze to get AI-powered ad optimization advice.</p>
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-[#1a1a2e] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-[#1a1a2e] rounded-lg p-1.5 text-center min-w-0">
              <p className="text-sm md:text-lg font-bold text-[#e0e0e0] truncate">{data.summary.overallROAS}x</p>
              <p className="text-[9px] md:text-[10px] text-[#606070]">ROAS</p>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-1.5 text-center min-w-0">
              <p className="text-sm md:text-lg font-bold text-[#e0e0e0] truncate">${data.summary.totalAdSpend}</p>
              <p className="text-[9px] md:text-[10px] text-[#606070]">Total Spend</p>
            </div>
          </div>

          {data.campaigns.length > 0 ? (
            <div className="space-y-1.5">
              {data.campaigns.map((c) => (
                <div key={c.name} className="bg-[#1a1a2e] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === c.name ? null : c.name)}
                    className="w-full flex items-center justify-between p-2.5 text-left hover:bg-[#25253a] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {ratingBadge(c.rating)}
                      <span className="text-xs text-[#e0e0e0] truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#a0a0b0]">{c.roas}x</span>
                      {expanded === c.name ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                  </button>
                  {expanded === c.name && (
                    <div className="px-2.5 pb-2.5 border-t border-[#25253a]">
                      <p className="text-[11px] text-[#9090a0] mt-2">{c.recommendation}</p>
                      <div className="mt-2 space-y-1">
                        {c.optimizationTips.map((tip, i) => (
                          <p key={i} className="text-[10px] text-[#606070] flex items-start gap-1">
                            <Zap className="w-2.5 h-2.5 mt-0.5 text-pink-400 shrink-0" />{tip}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#606070] text-center py-2">No ad campaigns found. Log orders with campaign names to track.</p>
          )}

          {data.insights.length > 0 && (
            <div className="space-y-1">
              {data.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-[#9090a0] bg-[#1a1a2e] rounded-lg p-2">
                  <TrendingUp className="w-3 h-3 mt-0.5 shrink-0 text-pink-400" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-[#505060] text-center">{data.summary.budgetRecommendation}</p>
        </div>
      )}
    </div>
  );
}
