"use client";

import { useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus, Star, BarChart3, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { authJson } from "@/lib/auth-headers";
import type { CompetitorIntelligence, CompetitorListing, MarketInsights } from "@/types/listing-intelligence";

interface CompetitorPanelProps {
  keyword: string;
  platform: string;
  onSelectListing?: (listing: CompetitorListing) => void;
  onIntelligenceLoaded?: (intelligence: CompetitorIntelligence) => void;
}

function CompetitionBadge({ level }: { level: MarketInsights["competitionLevel"] }) {
  const config = {
    low: { label: "Low Competition", color: "text-emerald-400 bg-emerald-400/10", icon: TrendingUp },
    medium: { label: "Medium", color: "text-amber-400 bg-amber-400/10", icon: Minus },
    high: { label: "High", color: "text-orange-400 bg-orange-400/10", icon: TrendingDown },
    "very-high": { label: "Very High", color: "text-red-400 bg-red-400/10", icon: TrendingDown },
  };
  const c = config[level] || config.medium;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${c.color}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function OpportunityScore({ score }: { score: number }) {
  const color = score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${score >= 70 ? "bg-emerald-400" : score >= 40 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${color}`}>{score}</span>
    </div>
  );
}

function CompetitorCard({ listing, onClick }: { listing: CompetitorListing; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full glass rounded-xl p-3 text-left hover:border-accent/20 transition-all group"
    >
      <div className="flex gap-3">
        {listing.image ? (
          <img src={listing.image} alt="" className="w-14 h-14 rounded-lg object-cover border border-white/[0.06] shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-surface flex items-center justify-center text-muted-foreground shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-[10px] font-bold text-accent">#{listing.rank}</span>
            <span className="text-xs font-bold text-foreground">${listing.price.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-foreground line-clamp-2 leading-tight mb-1">{listing.title}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {listing.rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                {listing.rating.toFixed(1)}
              </span>
            )}
            {listing.reviewCount > 0 && (
              <span>{listing.reviewCount.toLocaleString()} reviews</span>
            )}
            {listing.salesEstimate && (
              <span className="text-accent">~{listing.salesEstimate}/mo</span>
            )}
          </div>
          {listing.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {listing.keywords.slice(0, 3).map((kw, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[8px] font-semibold">{kw}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default function CompetitorPanel({ keyword, platform, onSelectListing, onIntelligenceLoaded }: CompetitorPanelProps) {
  const { error: toastError, warning: toastWarning } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompetitorIntelligence | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchIntelligence = async () => {
    if (!keyword.trim()) {
      toastWarning("Enter a product title or keyword first");
      return;
    }
    setLoading(true);
    try {
      const result = await authJson<{ intelligence?: CompetitorIntelligence; error?: string }>(
        "/api/ai/listings/competitors",
        { keyword: keyword.trim(), platform }
      );
      if (result.intelligence) {
        setData(result.intelligence);
        onIntelligenceLoaded?.(result.intelligence);
      } else {
        toastError("Failed to fetch competitor data");
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to fetch competitor data");
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Search className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Competitor Intelligence</p>
            <p className="text-[10px] text-muted-foreground">Analyze top listings in your niche</p>
          </div>
        </div>
        <button
          onClick={fetchIntelligence}
          disabled={loading || !keyword.trim()}
          className="w-full py-2.5 rounded-xl bg-purple-500/10 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "Analyzing competitors..." : "Analyze Competitors"}
        </button>
      </div>
    );
  }

  const { marketInsights, competitors } = data;
  const visibleCompetitors = showAll ? competitors : competitors.slice(0, 5);

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Market Intelligence</p>
            <p className="text-[10px] text-muted-foreground">{competitors.length} competitors analyzed</p>
          </div>
        </div>
        <CompetitionBadge level={marketInsights.competitionLevel} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-xl p-2.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Avg Price</p>
          <p className="text-sm font-bold text-foreground">${marketInsights.avgPrice.toFixed(2)}</p>
        </div>
        <div className="glass rounded-xl p-2.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Price Range</p>
          <p className="text-sm font-bold text-foreground">${marketInsights.priceRange.min.toFixed(0)}-${marketInsights.priceRange.max.toFixed(0)}</p>
        </div>
        <div className="glass rounded-xl p-2.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Avg Rating</p>
          <p className="text-sm font-bold text-foreground flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            {marketInsights.avgRating.toFixed(1)}
          </p>
        </div>
        <div className="glass rounded-xl p-2.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Saturation</p>
          <p className="text-sm font-bold text-foreground">{marketInsights.saturationScore}%</p>
        </div>
      </div>

      <div className="glass rounded-xl p-2.5">
        <p className="text-[10px] text-muted-foreground mb-1.5">Opportunity Score</p>
        <OpportunityScore score={marketInsights.opportunityScore} />
        {marketInsights.recommendedPrice > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Recommended price: <span className="text-accent font-semibold">${marketInsights.recommendedPrice.toFixed(2)}</span>
          </p>
        )}
      </div>

      {marketInsights.topKeywords.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Top Keywords</p>
          <div className="flex flex-wrap gap-1">
            {marketInsights.topKeywords.slice(0, 8).map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-[9px] font-semibold">
                {kw.keyword} <span className="text-muted-foreground">×{kw.frequency}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {marketInsights.insights.length > 0 && (
        <div className="space-y-1">
          {marketInsights.insights.map((insight, i) => (
            <div key={i} className="text-[10px] text-muted-foreground bg-surface rounded-lg px-2.5 py-1.5">
              💡 {insight}
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-[10px] text-muted-foreground mb-2">Top Competitors</p>
        <div className="space-y-2">
          {visibleCompetitors.map((listing) => (
            <CompetitorCard
              key={listing.rank}
              listing={listing}
              onClick={() => onSelectListing?.(listing)}
            />
          ))}
        </div>
        {competitors.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
          >
            {showAll ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showAll ? "Show less" : `Show all ${competitors.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
