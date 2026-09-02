"use client";

import Image from "next/image";
import { TrendingUp, TrendingDown, Minus, Flame, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { NicheData } from "@/types/niches";

export default function NicheListItem({ niche, index, onSelect }: { niche: NicheData; index: number; onSelect: (id: string) => void }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const trendIcon = niche.trend === "up" ? TrendingUp : niche.trend === "down" ? TrendingDown : Minus;
  const trendColor = niche.trend === "up" ? "text-emerald-400" : niche.trend === "down" ? "text-red-400" : "text-muted-foreground";
  const TrendIcon = trendIcon;
  const heatColor = niche.heat >= 80 ? "#ef4444" : niche.heat >= 60 ? "#f59e0b" : "#3b82f6";

  return (
    <div
      ref={ref}
      onClick={() => onSelect(niche.id)}
      className={`glass rounded-xl border border-border p-3 sm:p-4 cursor-pointer hover:border-accent/20 transition-all duration-500 group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-border shrink-0">
          <Image src={niche.image} alt={niche.name} width={64} height={64} unoptimized className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate">{niche.name}</h3>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold shrink-0 ${niche.grade.startsWith("A") ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : niche.grade.startsWith("B") ? "text-blue-400 bg-blue-400/10 border-blue-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>{niche.grade}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] text-muted-foreground flex-wrap">
            <span>{niche.productCount} products</span>
            <span>{niche.avgMargin}% margin</span>
            <span className="hidden sm:inline">{niche.saturation}% saturated</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-center">
            <div className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" style={{ color: heatColor }} />
              <span className="font-display text-sm font-bold" style={{ color: heatColor }}>{niche.heat}</span>
            </div>
            <span className="text-[9px] text-muted-foreground">heat</span>
          </div>
          <div className="text-center hidden sm:block">
            <div className={`flex items-center gap-0.5 ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              <span className="text-[10px] font-bold">+{niche.growth}%</span>
            </div>
            <span className="text-[9px] text-muted-foreground">growth</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
        </div>
      </div>
    </div>
  );
}
