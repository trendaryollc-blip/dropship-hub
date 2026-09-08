"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Package, Heart, Star, ChevronDown, Store, GitCompare,
  TrendingUp, BarChart3, AlertTriangle,
} from "lucide-react";
import GoldenScoreBadge from "./GoldenScoreBadge";
import PlatformPriceRow from "./PlatformPriceRow";
import type { MergedProduct } from "@/lib/search/dedup";
import type { EnrichedProduct } from "@/lib/search/enrichment";

const platformIcons: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", walmart: "\ud83c\udfea",
  etsy: "\ud83c\udfa8", temu: "\ud83d\udd25", shein: "\ud83d\udc57",
  banggood: "\u26a1", dhgate: "\ud83d\udd17", alibaba: "\ud83c\udf10",
};

const TREND_PHASE_LABELS: Record<string, { label: string; color: string }> = {
  emerging: { label: "Emerging", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  growth: { label: "Growing", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  mature: { label: "Mature", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  declining: { label: "Declining", color: "text-red-400 bg-red-500/10 border-red-500/20" },
};

const SATURATION_LABELS: Record<string, { label: string; color: string }> = {
  unsaturated: { label: "Low Competition", color: "text-emerald-400" },
  low: { label: "Low Sat.", color: "text-emerald-400" },
  moderate: { label: "Moderate", color: "text-amber-400" },
  saturated: { label: "Saturated", color: "text-orange-400" },
  "hyper-saturated": { label: "Hyper Sat.", color: "text-red-400" },
};

interface MergedProductCardProps {
  product: EnrichedProduct;
  index?: number;
  onSave?: (product: MergedProduct) => void;
  onCompare?: (product: MergedProduct) => void;
  isSaved?: boolean;
  isInCompare?: boolean;
}

export default function MergedProductCard({
  product,
  index = 0,
  onSave,
  onCompare,
  isSaved = false,
  isInCompare = false,
}: MergedProductCardProps) {
  const [showPrices, setShowPrices] = useState(false);

  const trendInfo = product.trendPhase ? TREND_PHASE_LABELS[product.trendPhase] : null;
  const satInfo = product.saturationLevel ? SATURATION_LABELS[product.saturationLevel] : null;

  return (
    <div
      className="glass-card-animated rounded-2xl overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-accent/5"
      data-testid="merged-product-card"
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      <div className="aspect-square bg-surface relative overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.title}
            width={400}
            height={400}
            unoptimized
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <Package className="h-12 w-12" />
          </div>
        )}

        {/* Platform Count Badge */}
        <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm flex items-center gap-1">
          <Store className="h-2.5 w-2.5" />
          {product.platformCount} platform{product.platformCount !== 1 ? "s" : ""}
        </span>

        {/* Golden Score Badge */}
        {product.goldenScore != null && (
          <div className="absolute top-2 right-2">
            <GoldenScoreBadge score={product.goldenScore} rank={product.goldenRank} size="md" />
          </div>
        )}

        {/* Trend Phase */}
        {trendInfo && (
          <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold border ${trendInfo.color} backdrop-blur-sm flex items-center gap-1`}>
            <TrendingUp className="h-2.5 w-2.5" />
            {trendInfo.label}
          </span>
        )}

        {/* Saturation */}
        {satInfo && (
          <span className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/60 ${satInfo.color} backdrop-blur-sm`}>
            {satInfo.label}
          </span>
        )}

        {/* Margin Badge */}
        {product.estimatedMargin != null && product.estimatedMargin > 0 && (
          <span className="absolute top-2 left-2 mt-8 px-2 py-1 rounded-lg bg-emerald-500/90 text-white text-[10px] font-bold backdrop-blur-sm flex items-center gap-1">
            <BarChart3 className="h-2.5 w-2.5" /> ~{product.estimatedMargin}%
          </span>
        )}

        {/* Action Buttons */}
        <div className="absolute top-2 left-2 mt-16 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave?.(product); }}
            className={`p-2.5 rounded-lg backdrop-blur-sm transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
              isSaved ? "bg-accent text-white" : "bg-black/60 text-white hover:bg-accent/80"
            }`}
            title={isSaved ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCompare?.(product); }}
            className={`p-2.5 rounded-lg backdrop-blur-sm transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${
              isInCompare ? "bg-accent text-white" : "bg-black/60 text-white hover:bg-accent/80"
            }`}
            title={isInCompare ? "Remove from compare" : "Add to compare"}
          >
            <GitCompare className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-accent transition-colors">
          {product.title}
        </h3>

        <div className="flex items-center justify-between">
          {product.bestPrice != null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-accent">${product.bestPrice.toFixed(2)}</span>
              {product.worstPrice != null && product.worstPrice > product.bestPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  ${product.worstPrice.toFixed(2)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Price N/A</span>
          )}
          {product.rating != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-amber-400 fill-current" />
              {product.rating.toFixed(1)}
              {product.reviews != null && <span>({product.reviews.toLocaleString()})</span>}
            </span>
          )}
        </div>

        {/* Price Spread Indicator */}
        {product.priceSpread > 0 && product.platformCount > 1 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <AlertTriangle className="h-2.5 w-2.5" />
            <span>{product.priceSpread.toFixed(0)}% price spread across platforms</span>
          </div>
        )}

        {/* Best Platform */}
        {product.bestPlatform && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <span>Best on {platformIcons[product.bestPlatform] || ""} {product.bestPlatform.replace("_", " ")}</span>
          </div>
        )}

        {/* Expandable Price Comparison */}
        {product.platforms.length > 1 && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPrices(!showPrices); }}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showPrices ? "rotate-180" : ""}`} />
            Compare {product.platforms.length} prices
          </button>
        )}

        {showPrices && (
          <PlatformPriceRow
            offers={product.platforms}
            bestPrice={product.bestPrice}
            bestPlatform={product.bestPlatform}
          />
        )}
      </div>
    </div>
  );
}
