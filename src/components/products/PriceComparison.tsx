"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Star, ShieldCheck, BadgeCheck, ArrowDownRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { PlatformPrice } from "@/types/enrichment";

function MiniSparkline({ points, id }: { points: number[]; id: string }) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard SSR mount guard
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="w-[72px] h-[24px] shrink-0" />;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 72, h = 24;
  const pts = points.map((p, i) => ({ x: (i / (points.length - 1)) * w, y: h - ((p - min) / range) * h }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`pc-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#pc-${id})`} />
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function PriceComparison({ platforms, listedPrice, productTitle }: { platforms: PlatformPrice[]; listedPrice: number; productTitle?: string }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const validPlatforms = platforms.filter((p) => p.price > 0);
  const sorted = [...validPlatforms].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];
  const bestRated = [...validPlatforms].sort((a, b) => b.rating - a.rating)[0];

  if (!validPlatforms.length || !cheapest || !bestRated) {
    return (
      <div ref={ref} className={`price-table-card transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="icon-container-blue">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-sm font-semibold text-foreground">Price Comparison</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {listedPrice > 0
                  ? `Listed at $${listedPrice.toFixed(2)} — searching other platforms for better deals...`
                  : "Search across platforms to compare prices and find the best deal."}
              </p>
            </div>
            <a href={`/calculator?price=${listedPrice}${productTitle ? `&title=${encodeURIComponent(productTitle)}` : ""}`} className="shrink-0 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors border border-accent/15">
              Use Calculator
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isSinglePlatform = validPlatforms.length === 1;

  if (isSinglePlatform) {
    return (
      <div ref={ref} className={`price-table-card transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="icon-container-blue">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold text-foreground">Listed Price</h3>
                <p className="text-xs text-muted-foreground truncate">Found on {sorted[0].platform}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-2xl sm:text-3xl font-bold gradient-text-blue">${sorted[0].price.toFixed(2)}</p>
              <div className="flex items-center gap-1 justify-end mt-1">
                <Star className="h-3 w-3 text-amber-400 fill-current" />
                <span className="text-[10px] text-muted-foreground">{sorted[0].rating} ({(sorted[0].reviews || 0).toLocaleString()})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const savings = sorted[sorted.length - 1].price - cheapest.price;
  const savingsPct = Math.round((savings / sorted[sorted.length - 1].price) * 100);

  return (
    <div ref={ref} className={`price-table-card transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Header dashboard */}
      <div className="price-header-bar">
        <div className="flex items-center gap-3">
          <div className="icon-container-blue">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Price Comparison</h3>
            <p className="text-[10px] text-muted-foreground">Found on {validPlatforms.length} platforms</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lowest</p>
            <p className="font-display text-lg font-bold text-emerald-400">${cheapest.price.toFixed(2)}</p>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Savings</p>
            <p className="font-display text-lg font-bold text-emerald-400 flex items-center gap-1 justify-end">
              <ArrowDownRight className="h-4 w-4" />
              ${savings.toFixed(2)} <span className="text-xs text-emerald-400/70">({savingsPct}%)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Platform</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Rating</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Trend</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Stock</th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Savings</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const rowSavings = listedPrice - p.price;
              const rowSavingsPct = listedPrice > 0 ? Math.round((rowSavings / listedPrice) * 100) : 0;
              const isCheapest = p.platform === cheapest.platform;
              const isBestRated = p.platform === bestRated.platform;
              return (
                <tr key={`${p.platform}-${i}`} className={`price-row border-b border-border/30 transition-all ${isCheapest ? "price-row-cheapest" : isBestRated && !isCheapest ? "price-row-best" : ""} ${isInView ? "opacity-100" : "opacity-0"}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-medium text-foreground text-sm">{p.platform}</span>
                      {isCheapest && (
                        <span className="badge-shimmer text-[9px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-bold border border-emerald-400/20 flex items-center gap-0.5">
                          <BadgeCheck className="h-2.5 w-2.5" /> Best Deal
                        </span>
                      )}
                      {isBestRated && !isCheapest && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 font-bold border border-blue-400/20 flex items-center gap-0.5">
                          <ShieldCheck className="h-2.5 w-2.5" /> Most Trusted
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`font-display font-bold text-sm ${isCheapest ? "text-emerald-400" : "text-foreground"}`}>${p.price.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3 w-3 text-amber-400 fill-current" />
                      <span className="text-xs text-foreground font-medium">{p.rating}</span>
                      <span className="text-[10px] text-muted-foreground">({(p.reviews || 0).toLocaleString()})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    {p.sparkline && p.sparkline.length > 1 ? (
                      <MiniSparkline points={p.sparkline} id={p.platform} />
                    ) : (
                      <div className="w-[72px] h-[24px] shrink-0 rounded-lg bg-surface/50 border border-border/30" />
                    )}
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${p.inStock ? "bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.4)]" : "bg-red-400"}`} />
                      <span className="text-xs text-muted-foreground">{p.inStock ? "In Stock" : "Out of Stock"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {rowSavings > 0 ? (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5 justify-end">
                        <ArrowDownRight className="h-3 w-3" />
                        -${rowSavings.toFixed(2)} ({rowSavingsPct}%)
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
