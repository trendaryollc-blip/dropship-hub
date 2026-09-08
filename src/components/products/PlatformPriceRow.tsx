"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Check } from "lucide-react";

interface PlatformOffer {
  platform: string;
  price: number | null;
  link: string;
  originalTitle: string;
  rating?: number;
  reviews?: number;
}

interface PlatformPriceRowProps {
  offers: PlatformOffer[];
  bestPrice: number | null;
  bestPlatform: string;
  maxVisible?: number;
}

const platformIcons: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", walmart: "\ud83c\udfea",
  etsy: "\ud83c\udfa8", temu: "\ud83d\udd25", shein: "\ud83d\udc57",
  banggood: "\u26a1", dhgate: "\ud83d\udd17", alibaba: "\ud83c\udf10",
  "1688": "\ud83c\udf10",
};

export default function PlatformPriceRow({
  offers,
  bestPrice,
  bestPlatform,
  maxVisible = 3,
}: PlatformPriceRowProps) {
  const [expanded, setExpanded] = useState(false);

  const sorted = [...offers]
    .filter((o) => o.price != null)
    .sort((a, b) => (a.price || 0) - (b.price || 0));

  if (sorted.length === 0) return null;

  const visible = expanded ? sorted : sorted.slice(0, maxVisible);
  const hiddenCount = sorted.length - maxVisible;

  return (
    <div className="space-y-1" data-testid="platform-price-row">
      {visible.map((offer) => {
        const isBest = offer.platform === bestPlatform || offer.price === bestPrice;
        const savings = bestPrice != null && offer.price != null && offer.price > bestPrice
          ? Math.round(((offer.price - bestPrice) / offer.price) * 100)
          : 0;

        return (
          <div
            key={offer.platform}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
              isBest
                ? "bg-emerald-500/10 border border-emerald-500/20"
                : "bg-white/5 border border-transparent hover:bg-white/10"
            }`}
          >
            <span className="text-sm">{platformIcons[offer.platform] || "\ud83d\udd17"}</span>
            <span className="font-medium text-gray-300 capitalize min-w-[70px]">
              {offer.platform.replace("_", " ")}
            </span>
            <span className={`font-bold ml-auto ${isBest ? "text-emerald-400" : "text-white"}`}>
              ${offer.price!.toFixed(2)}
            </span>
            {isBest && (
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded flex items-center gap-0.5">
                <Check className="h-2.5 w-2.5" /> Best
              </span>
            )}
            {!isBest && savings > 0 && (
              <span className="text-[9px] text-orange-400 font-medium">
                +{savings}% more
              </span>
            )}
            <a
              href={offer.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white transition-colors px-2"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show less" : `+${hiddenCount} more platform${hiddenCount > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
