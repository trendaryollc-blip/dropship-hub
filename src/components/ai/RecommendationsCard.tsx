"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface Recommendation {
  id: string;
  title: string;
  category: string;
  sourcePrice: number;
  suggestedSellPrice: number;
  estimatedMargin: number;
  confidence: number;
  reason: string;
  matchType: string;
  riskLevel: string;
  competitionLevel: string;
  matchScore: number;
  reasoning: string;
  tags: string[];
}

interface RecommendationsCardProps {
  recommendations: Recommendation[];
  onAskAI: (prompt: string) => void;
}

function MatchBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    "trending": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "high-margin": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "niche-expansion": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "gap-fill": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "seasonal": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${styles[type] || styles["trending"]}`}>
      {type.replace("-", " ")}
    </span>
  );
}

export default function RecommendationsCard({ recommendations, onAskAI }: RecommendationsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? recommendations : recommendations.slice(0, 3);

  if (recommendations.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
            <Sparkles className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Product Recommendations</p>
            <p className="text-[10px] text-muted-foreground">{recommendations.length} products matched to your business</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
          {displayed.map((rec) => (
            <div key={rec.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{rec.title}</p>
                  <p className="text-[10px] text-muted-foreground">{rec.category}</p>
                </div>
                <MatchBadge type={rec.matchType} />
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-muted-foreground">Cost: <span className="text-foreground font-medium">${rec.sourcePrice}</span></span>
                <span className="text-muted-foreground">Sell: <span className="text-emerald-400 font-medium">${rec.suggestedSellPrice}</span></span>
                <span className="text-muted-foreground">Margin: <span className="text-accent font-medium">{rec.estimatedMargin}%</span></span>
                <span className="text-muted-foreground">Score: <span className="text-foreground font-medium">{rec.matchScore}</span></span>
              </div>
              <p className="text-[10px] text-muted-foreground/80">{rec.reasoning}</p>
              <button
                onClick={() => onAskAI(`Tell me more about "${rec.title}" — should I add it to my store? What's the best strategy for this product?`)}
                className="text-[10px] text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
              >
                Ask AI about this product <ExternalLink className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          {recommendations.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {showAll ? "Show less" : `Show ${recommendations.length - 3} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
