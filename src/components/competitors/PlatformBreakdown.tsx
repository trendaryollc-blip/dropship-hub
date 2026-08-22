"use client";

import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { PlatformData } from "@/lib/mock-competitors";

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 24;
  const w = 60;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default function PlatformBreakdown({ platforms }: { platforms: PlatformData[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="text-lg">📊</span> Platform Breakdown
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {platforms.map((p, i) => (
          <div
            key={p.platform}
            className={`glass rounded-xl p-3 sm:p-5 border border-border hover:border-accent/20 transition-all duration-500 group cursor-pointer ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{p.icon}</span>
                <span className="font-display text-sm font-semibold text-foreground">{p.platform}</span>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                p.trend === "up" ? "text-emerald-400 bg-emerald-400/10" :
                p.trend === "down" ? "text-red-400 bg-red-400/10" :
                "text-muted-foreground bg-surface"
              }`}>
                {p.trend === "up" ? <TrendingUp className="h-3 w-3" /> : p.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {p.trendPercent > 0 ? "+" : ""}{p.trendPercent}%
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-baseline">
                <span className="text-xl sm:text-2xl font-bold text-foreground">${p.avgPrice.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground uppercase">avg price</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>${p.minPrice.toFixed(2)} - ${p.maxPrice.toFixed(2)}</span>
                <span>{p.sellerCount} sellers</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <MiniSparkline data={p.sparkline} color={p.trend === "up" ? "#34d399" : p.trend === "down" ? "#f87171" : "#94a3b8"} />
              <span className="text-[10px] text-muted-foreground">7-day trend</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {p.listings.slice(0, 2).map((l) => (
                <div key={l.id} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-surface/50 rounded-md px-2 py-1 border border-border/50 max-w-full">
                  <span className="truncate">{l.seller}</span>
                  <span className="text-accent font-medium shrink-0">${l.price.toFixed(0)}</span>
                </div>
              ))}
            </div>

            <button className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-accent hover:text-accent/80 opacity-0 group-hover:opacity-100 transition-all duration-300 py-1.5 rounded-lg bg-accent/5 hover:bg-accent/10">
              View all listings <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
