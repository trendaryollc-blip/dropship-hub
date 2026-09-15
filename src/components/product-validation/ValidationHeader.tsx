"use client";

import { Package, Star } from "lucide-react";

interface ValidationHeaderProps {
  title: string;
  imageUrl?: string;
  overallScore: number;
  rank: string;
  category?: string;
  price?: number;
}

const rankConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  S: { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", label: "S-Tier" },
  A: { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30", label: "A-Tier" },
  B: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", label: "B-Tier" },
  C: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30", label: "C-Tier" },
  D: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", label: "D-Tier" },
};

export default function ValidationHeader({ title, imageUrl, overallScore, rank, category, price }: ValidationHeaderProps) {
  const rankInfo = rankConfig[rank] ?? rankConfig.B;

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

      <div className="flex items-start gap-5 relative">
        {/* Product Image */}
        <div className="w-20 h-20 rounded-2xl bg-surface/50 border border-border/50 flex items-center justify-center shrink-0 overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <Package className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-foreground truncate">{title}</h2>
              <div className="flex items-center gap-3 mt-1.5">
                {category && (
                  <span className="text-[11px] text-muted-foreground px-2.5 py-1 rounded-full bg-surface/50 border border-border/30">
                    {category}
                  </span>
                )}
                {price && (
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    ${price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Rank Badge */}
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl ${rankInfo.bg} border ${rankInfo.border}`}>
              <Star className={`h-4 w-4 ${rankInfo.color}`} />
              <div>
                <span className={`text-sm font-display font-black ${rankInfo.color}`}>{rankInfo.label}</span>
                <p className="text-[9px] text-muted-foreground">{overallScore}/100</p>
              </div>
            </div>
          </div>

          {/* Score Bar */}
          <div className="mt-4">
            <div className="h-2.5 rounded-full bg-surface overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${
                  overallScore >= 90 ? "from-yellow-400 to-amber-500" :
                  overallScore >= 75 ? "from-emerald-400 to-emerald-500" :
                  overallScore >= 60 ? "from-blue-400 to-blue-500" :
                  overallScore >= 40 ? "from-amber-400 to-amber-500" :
                  "from-red-400 to-red-500"
                }`}
                style={{ width: `${overallScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
