"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ExternalLink, X, Star, MapPin } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { PlatformData, CompetitorListing } from "@/lib/mock-competitors";

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

function ListingModal({ platform, listings, onClose }: { platform: string; listings: CompetitorListing[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass rounded-2xl border border-border w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display text-lg font-bold text-foreground">{platform} Listings</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
          {listings.map((l) => (
            <a key={l.id} href={l.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border/50 hover:border-accent/20 transition-all group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">{l.title}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="h-2.5 w-2.5 text-amber-400 fill-current" /> {l.seller}</span>
                  <span>{l.condition}</span>
                  <span>{l.shipping === "Free" ? "Free shipping" : `+${l.shipping} shipping`}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-lg font-bold text-accent">${l.price.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">{l.daysAgo}d ago</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlatformBreakdown({ platforms }: { platforms: PlatformData[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformData | null>(null);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="text-lg">📊</span> Platform Breakdown
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {platforms.map((p, i) => (
          <div
            key={p.platform}
            onClick={() => setSelectedPlatform(p)}
            className={`glass rounded-xl p-3 sm:p-5 border border-border hover:border-accent/20 transition-all duration-500 group cursor-pointer active:scale-[0.98] ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
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

            <div className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-accent py-1.5 rounded-lg bg-accent/5 group-hover:bg-accent/10 transition-all">
              View {p.listings.length} listings <ExternalLink className="h-3 w-3" />
            </div>
          </div>
        ))}
      </div>

      {selectedPlatform && (
        <ListingModal platform={selectedPlatform.platform} listings={selectedPlatform.listings} onClose={() => setSelectedPlatform(null)} />
      )}
    </div>
  );
}
