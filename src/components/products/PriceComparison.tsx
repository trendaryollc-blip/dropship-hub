"use client";

import { ExternalLink, TrendingUp, TrendingDown, Minus, Star, ShieldCheck, BadgeCheck } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { PlatformPrice } from "@/lib/mock-enrichment";

function MiniSparkline({ points, id }: { points: number[]; id: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 60, h = 20;
  const pts = points.map((p, i) => ({ x: (i / (points.length - 1)) * w, y: h - ((p - min) / range) * h }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`pc-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#pc-${id})`} />
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function PriceComparison({ platforms, listedPrice }: { platforms: PlatformPrice[]; listedPrice: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const sorted = [...platforms].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];
  const bestRated = [...platforms].sort((a, b) => b.rating - a.rating)[0];

  if (!sorted.length || !cheapest || !bestRated) return null;

  return (
    <div ref={ref} className={`glass rounded-2xl border border-border overflow-hidden transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">Price Comparison</h3>
              <p className="text-[10px] text-muted-foreground">Found on {platforms.length} platforms</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Potential savings</p>
            <p className="text-sm font-bold text-emerald-400">
              ${(sorted[sorted.length - 1].price - cheapest.price).toFixed(2)} ({Math.round(((sorted[sorted.length - 1].price - cheapest.price) / sorted[sorted.length - 1].price) * 100)}%)
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Platform</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Rating</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Trend</th>
              <th className="text-left px-3 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Stock</th>
              <th className="text-right px-5 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Savings</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const savings = listedPrice - p.price;
              const savingsPct = listedPrice > 0 ? Math.round((savings / listedPrice) * 100) : 0;
              const isCheapest = p.platform === cheapest.platform;
              const isBestRated = p.platform === bestRated.platform;
              return (
                <tr key={p.platform} className={`border-b border-border/30 transition-all ${isInView ? "opacity-100" : "opacity-0"} hover:bg-surface/50`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{p.platform}</span>
                      {isCheapest && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-bold border border-emerald-400/20 flex items-center gap-0.5">
                          <BadgeCheck className="h-2.5 w-2.5" /> Best Deal
                        </span>
                      )}
                      {isBestRated && !isCheapest && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-400/10 text-blue-400 font-bold border border-blue-400/20 flex items-center gap-0.5">
                          <ShieldCheck className="h-2.5 w-2.5" /> Most Trusted
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-bold ${isCheapest ? "text-emerald-400" : "text-foreground"}`}>${p.price.toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400 fill-current" />
                      <span className="text-xs text-foreground">{p.rating}</span>
                      <span className="text-[10px] text-muted-foreground">({p.reviews.toLocaleString()})</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <MiniSparkline points={p.sparkline} id={p.platform} />
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${p.inStock ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className="text-xs text-muted-foreground">{p.inStock ? "In Stock" : "Out of Stock"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {savings > 0 ? (
                      <span className="text-xs font-semibold text-emerald-400">-${savings.toFixed(2)} ({savingsPct}%)</span>
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
