"use client";

import Link from "next/link";
import {
  Flame, TrendingUp, TrendingDown, Activity, Eye, ChevronRight,
  Crosshair, Shield, BarChart3, ArrowUpRight,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { SectionDivider } from "./SectionDivider";
import { MiniSparkline } from "./MiniSparkline";
import type { HeatmapCategory, TickerItem } from "@/types/dashboard";

export function MarketIntelligence({ heatmap, ticker }: { heatmap: HeatmapCategory[]; ticker: TickerItem[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const overheating = heatmap.filter(c => c.heat >= 80).length;
  const trendingUp = heatmap.filter(c => c.trend === "up").length;
  const cooling = heatmap.filter(c => c.trend === "down").length;

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Market Intelligence" icon={Eye} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
        {/* Heatmap */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-orange-500/[0.06] to-red-500/[0.03] border border-orange-500/15 hover:border-orange-500/25 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-semibold text-white">Market Heatmap</span>
              <span className="flex items-center gap-1 text-[9px] text-emerald-400"><Activity className="h-2.5 w-2.5" />Live</span>
            </div>
            <Link href="/products" className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              Full Map <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/15">
              <Flame className="h-3 w-3 text-red-400" />
              <span className="text-[10px] font-bold text-red-400">{overheating}</span>
              <span className="text-[9px] text-red-400/70">overheating</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400">{trendingUp}</span>
              <span className="text-[9px] text-emerald-400/70">trending up</span>
            </div>
            {cooling > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/15">
                <TrendingDown className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] font-bold text-blue-400">{cooling}</span>
                <span className="text-[9px] text-blue-400/70">cooling</span>
              </div>
            )}
          </div>

          {heatmap.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-gray-600">No heatmap data available</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {heatmap.slice(0, 8).map((cat) => {
                const getColor = (h: number) => h >= 80 ? "from-red-500/20 to-red-500/5 border-red-500/20" : h >= 60 ? "from-orange-500/15 to-orange-500/5 border-orange-500/15" : h >= 40 ? "from-amber-500/10 to-amber-500/5 border-amber-500/15" : "from-blue-500/10 to-blue-500/5 border-blue-500/15";
                const getTxt = (h: number) => h >= 80 ? "text-red-400" : h >= 60 ? "text-orange-400" : h >= 40 ? "text-amber-400" : "text-blue-400";
                return (
                  <div key={cat.category} className={`p-3 rounded-xl bg-gradient-to-br ${getColor(cat.heat)} border transition-all duration-300 hover:scale-[1.03]`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-white truncate">{cat.category}</span>
                      <span className={`text-[10px] font-bold ${getTxt(cat.heat)}`}>{cat.heat}</span>
                    </div>
                    <p className="text-[8px] text-gray-500 truncate mb-1">{cat.topProduct}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-emerald-400/70">{cat.avgMargin}% margin</span>
                      <span className={`text-[8px] ${cat.trend === "up" ? "text-emerald-400" : cat.trend === "down" ? "text-red-400" : "text-gray-500"}`}>
                        {cat.trend === "up" ? "↑" : cat.trend === "down" ? "↓" : "→"}
                      </span>
                    </div>
                    {cat.velocity !== 0 && (
                      <span className={`text-[8px] font-semibold ${cat.velocity > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {cat.velocity > 0 ? "+" : ""}{cat.velocity}%/wk
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Market Pulse + Tools */}
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-xs font-semibold text-white">Market Pulse</span>
              <span className="ml-auto flex items-center gap-1 text-[9px] text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Live</span>
            </div>
            {ticker.length === 0 ? (
              <p className="text-[10px] text-gray-600 text-center py-3">No ticker data</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {ticker.slice(0, 6).map((t, i) => (
                  <div key={`${t.name}-${t.change}-${i}`} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{t.name}</span>
                      <span className="text-[9px] text-gray-600">{t.platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">${t.price?.toFixed(2)}</span>
                      <span title="Price vs category average" className={`font-semibold ${t.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {t.change >= 0 ? "+" : ""}{t.change}%
                      </span>
                      <MiniSparkline data={t.sparkline} color={t.change >= 0 ? "#22c55e" : "#ef4444"} width={40} height={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Competitive Tools</p>
            <div className="space-y-1.5">
              {[
                { icon: Crosshair, label: "Competitor Analysis", href: "/competitors", color: "text-red-400" },
                { icon: Shield, label: "Price War Tracker", href: "/price-war", color: "text-amber-400" },
                { icon: BarChart3, label: "Reports", href: "/reports", color: "text-blue-400" },
              ].map((l) => (
                <Link key={l.href} href={l.href} aria-label={`Open ${l.label}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-all group">
                  <l.icon className={`h-4 w-4 ${l.color}`} />
                  <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">{l.label}</span>
                  <ChevronRight className="h-3 w-3 text-gray-600 ml-auto group-hover:text-gray-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
