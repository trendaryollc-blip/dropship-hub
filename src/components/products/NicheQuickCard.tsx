"use client";

import Image from "next/image";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { NicheQuickCard as NicheQuickCardType } from "@/types/products-types";

export default function NicheQuickCard({ niche, index }: { niche: NicheQuickCardType; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  const trendIcon = niche.trend === "up" ? TrendingUp : niche.trend === "down" ? TrendingDown : Minus;
  const trendColor = niche.trend === "up" ? "text-emerald-400" : niche.trend === "down" ? "text-red-400" : "text-muted-foreground";
  const TrendIcon = trendIcon;

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
    <a
      href={`/products?q=${encodeURIComponent(niche.query)}`}
      className="group block rounded-xl border border-border overflow-hidden bg-surface/50 hover:border-accent/20 hover:bg-accent/5 transition-all duration-300 hover:scale-[1.02]"
    >
      <div className="relative h-28 overflow-hidden">
        <Image
          src={niche.image}
          alt={niche.name}
          width={400}
          height={112}
          unoptimized
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/20 to-transparent" />
        <div className={`absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md backdrop-blur-sm ${niche.trend === "up" ? "bg-emerald-400/10" : niche.trend === "down" ? "bg-red-400/10" : "bg-surface/50"}`}>
          <TrendIcon className={`h-2.5 w-2.5 ${trendColor}`} />
          <span className={`text-[9px] font-bold ${trendColor}`}>{niche.trendPercent > 0 ? "+" : ""}{niche.trendPercent}%</span>
        </div>
      </div>
      <div className="p-3">
        <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors mb-1 line-clamp-1">{niche.name}</h4>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{niche.productCount} products</span>
          <span className="text-[10px] text-muted-foreground">{niche.avgPrice}</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-accent opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-semibold">Explore</span>
          <ArrowUpRight className="h-3 w-3" />
        </div>
      </div>
    </a>
    </div>
  );
}
