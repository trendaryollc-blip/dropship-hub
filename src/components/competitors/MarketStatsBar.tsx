"use client";

import { Package, DollarSign, BarChart3, Target, TrendingUp } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { MarketData } from "@/lib/mock-competitors";

export default function MarketStatsBar({ data }: { data: MarketData }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const stats = [
    { icon: Package, label: "Listings", value: data.totalListings, color: "text-blue-400", bgColor: "bg-blue-400/10" },
    { icon: DollarSign, label: "Price Range", value: `$${data.minPrice.toFixed(0)}-$${data.maxPrice.toFixed(0)}`, color: "text-purple-400", bgColor: "bg-purple-400/10" },
    { icon: BarChart3, label: "Average", value: `$${data.avgPrice.toFixed(2)}`, color: "text-amber-400", bgColor: "bg-amber-400/10" },
    { icon: TrendingUp, label: "Median", value: `$${data.medianPrice.toFixed(2)}`, color: "text-cyan-400", bgColor: "bg-cyan-400/10" },
    { icon: Target, label: "Profit Zone", value: `$${data.profitZone.min.toFixed(0)}-$${data.profitZone.max.toFixed(0)}`, color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
  ];

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((stat, i) => (
          <div key={stat.label} className={`glass rounded-xl p-3 sm:p-4 border border-border text-center transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${i * 80}ms` }}>
            <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center mx-auto mb-2`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="font-display text-base sm:text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 h-3 rounded-full bg-surface overflow-hidden border border-border/50">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 via-emerald-400/40 to-emerald-500/60" style={{ marginLeft: `${((data.profitZone.min - data.minPrice) / (data.maxPrice - data.minPrice)) * 100}%`, width: `${((data.profitZone.max - data.profitZone.min) / (data.maxPrice - data.minPrice)) * 100}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground">${data.minPrice.toFixed(0)}</span>
        <span className="text-[9px] text-emerald-400 font-medium">{data.profitZone.label}</span>
        <span className="text-[9px] text-muted-foreground">${data.maxPrice.toFixed(0)}</span>
      </div>
    </div>
  );
}
