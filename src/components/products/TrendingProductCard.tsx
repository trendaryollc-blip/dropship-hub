"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TrendingUp, ChevronDown, ChevronUp, Flame, ExternalLink, Package } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import MiniSparkline from "./MiniSparkline";
import ScoreRing from "./ScoreRing";
import type { TrendingSearchProduct } from "@/types/products-types";

const demandConfig: Record<string, { label: string; cls: string }> = {
  low: { label: "Low demand", cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  medium: { label: "Med demand", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  high: { label: "High demand", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
};

const compConfig: Record<string, { label: string; cls: string }> = {
  low: { label: "Low comp", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  medium: { label: "Med comp", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  high: { label: "High comp", cls: "text-red-400 bg-red-400/10 border-red-400/20" },
};

export default function TrendingProductCard({ product, index, rank }: {
  product: TrendingSearchProduct;
  index: number;
  rank: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const [expanded, setExpanded] = useState(false);

  const rankGradients = [
    "from-yellow-400 to-amber-500",
    "from-slate-300 to-slate-400",
    "from-orange-400 to-orange-500",
    "from-blue-400/60 to-blue-500",
    "from-purple-400/60 to-purple-500",
    "from-pink-400/60 to-pink-500",
  ];
  const rankBg = rankGradients[Math.max(0, Math.min(rank - 1, rankGradients.length - 1))];
  const demand = demandConfig[product.demandLevel];
  const comp = compConfig[product.competitionLevel];

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className={`glass-card-animated rounded-2xl overflow-hidden transition-all duration-300 ${expanded ? "ring-1 ring-accent/30" : ""}`}>
        <div
          className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer hover:bg-surface/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${rankBg} flex items-center justify-center shrink-0 shadow-lg`}>
            <span className="text-xs font-black text-white">#{rank}</span>
          </div>

          <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden">
            {product.image ? (
              <Image src={product.image} alt={product.name} width={44} height={44} unoptimized className="w-full h-full object-cover" />
            ) : (
              <Package className="h-5 w-5 text-accent" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground">{product.platform}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${demand.cls}`}>{demand.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${comp.cls}`}>{comp.label}</span>
            </div>
          </div>

          <div className="hidden sm:block shrink-0">
            <MiniSparkline points={product.sparkline} color="#22c55e" id={`trending-${rank}`} />
          </div>

          <div className="hidden md:block shrink-0">
            <ScoreRing score={product.confidence} size={40} />
          </div>

          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-emerald-400">${product.profit.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">margin {product.margin}%</p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-emerald-400">+{product.trend}%</span>
            <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
              <TrendingUp className="h-2.5 w-2.5" /> trending
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border/50 px-4 sm:px-5 pb-4 sm:pb-5 pt-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-0.5">Source Price</p>
                <p className="text-sm font-bold text-foreground">${product.price.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-0.5">Sell Price</p>
                <p className="text-sm font-bold text-foreground">${product.sellPrice.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-0.5">Profit</p>
                <p className="text-sm font-bold text-emerald-400">${product.profit.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-0.5">Margin</p>
                <p className="text-sm font-bold text-emerald-400">{product.margin}%</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-accent-warm" />
                <span className="text-[10px] text-muted-foreground">AI Score: {product.confidence}/100</span>
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-700" style={{ width: `${product.confidence}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href={`/products?q=${encodeURIComponent(product.name)}`}
                className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Search This Product
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
