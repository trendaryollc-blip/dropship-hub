"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI } from "@/hooks/useAPI";
import DataSourceBadge from "@/components/ui/DataSourceBadge";
import DataUnavailable from "@/components/ui/DataUnavailable";

export interface NichesSectionNiche {
  id: string;
  name: string;
  icon: string;
  image: string;
  category: string;
  heat: number;
  productCount: number;
  avgMargin: number | null;
  growth: number | null;
  trend: "up" | "down" | "stable" | null;
  avgSellingPrice: number | null;
}

export default function NichesSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const { data, isLoading: loading } = useAPI<{
    niches?: NichesSectionNiche[];
    isFallback?: boolean;
    reason?: string;
    setup?: { what?: string; whereToGet?: string; whereToSet?: string };
  }>("/api/niches");
  const niches = (data?.niches || []).slice(0, 8);
  const isFallback = Boolean(data?.isFallback);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" aria-hidden="true" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Popular Niches</h3>
            <p className="text-[10px] text-muted-foreground">Live CJ categories with real product counts and prices</p>
          </div>
          {!loading && !isFallback && niches.length > 0 && (
            <DataSourceBadge source="live" className="ml-1" />
          )}
        </div>
        {!isFallback && (
          <Link href="/products/niches" className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded">
            View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface/50 overflow-hidden animate-pulse">
              <div className="h-28 bg-surface" />
              <div className="p-3 space-y-2"><div className="h-4 bg-surface rounded w-2/3" /><div className="h-3 bg-surface rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && isFallback && (
        <DataUnavailable
          title="Niches require CJ API"
          reason={data?.reason || "Live niche data is unavailable until CJ Dropshipping is configured."}
          setup={{
            what: data?.setup?.what || "CJ Dropshipping API key",
            whereToGet: data?.setup?.whereToGet || "https://developers.cjdropshipping.com/",
            whereToSet: data?.setup?.whereToSet || "CJ_API_KEY",
          }}
        />
      )}

      {!loading && !isFallback && niches.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">No niche data available</p>
        </div>
      )}

      {!loading && !isFallback && niches.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {niches.map((niche, i) => {
            const trendColor = niche.trend === "up" ? "text-emerald-400" : niche.trend === "down" ? "text-red-400" : "text-muted-foreground";
            const trendBg = niche.trend === "up" ? "bg-emerald-400/10" : niche.trend === "down" ? "bg-red-400/10" : "bg-surface/50";
            return (
              <div key={niche.id} className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${i * 60}ms` }}>
                <Link href={`/products?q=${encodeURIComponent(niche.name)}`} className="group block rounded-xl border border-border overflow-hidden bg-surface/50 hover:border-accent/20 hover:bg-accent/5 transition-all duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
                  <div className="relative h-28 overflow-hidden bg-surface">
                    {niche.image ? (
                      <Image
                        src={niche.image}
                        alt={niche.name}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-muted/20">
                        <span className="text-4xl opacity-20" aria-hidden="true">{niche.icon}</span>
                      </div>
                    )}
                    {niche.growth != null && (
                      <div className={`absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md backdrop-blur-sm ${trendBg}`}>
                        <span className={`text-[9px] font-bold ${trendColor}`}>{niche.growth > 0 ? "+" : ""}{niche.growth}%</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors mb-1 line-clamp-1">{niche.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{niche.productCount} products</span>
                      <span className="text-[10px] text-muted-foreground">
                        {niche.avgSellingPrice != null ? `$${niche.avgSellingPrice.toFixed(0)} avg` : "price n/a"}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
