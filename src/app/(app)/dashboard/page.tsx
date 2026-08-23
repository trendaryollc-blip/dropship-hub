"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Truck,
  Calculator,
  ArrowUpRight,
  Zap,
  Target,
  CheckCircle2,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

import MarketPulseTicker from "@/components/dashboard/MarketPulseTicker";
import AIDailyPick from "@/components/dashboard/AIDailyPick";
import RevenueForecast from "@/components/dashboard/RevenueForecast";
import IntelligenceHub from "@/components/dashboard/IntelligenceHub";
import NicheRadarCards from "@/components/dashboard/NicheRadarCards";
import SupplierStatusCards from "@/components/dashboard/SupplierStatusCards";
import DailyMission from "@/components/dashboard/DailyMission";
import MarketplaceHeatmap from "@/components/dashboard/MarketplaceHeatmap";
import InlineCalculator from "@/components/dashboard/InlineCalculator";
import QuickCompareBar from "@/components/dashboard/QuickCompareBar";
import TrendingProducts from "@/components/dashboard/TrendingProducts";
import GreetingCard from "@/components/dashboard/GreetingCard";

function QuickActionCard({ action, index, visible }: { action: { label: string; description: string; href: string; color: string }; index: number; visible: boolean }) {
  const colorMap: Record<string, { icon: typeof Search; color: string; bg: string; gradient: string }> = {
    blue: { icon: Search, color: "text-blue-400", bg: "bg-blue-400/10", gradient: "from-blue-400/20 to-blue-500/5" },
    emerald: { icon: Truck, color: "text-emerald-400", bg: "bg-emerald-400/10", gradient: "from-emerald-400/20 to-emerald-500/5" },
    amber: { icon: Calculator, color: "text-amber-400", bg: "bg-amber-400/10", gradient: "from-amber-400/20 to-amber-500/5" },
    purple: { icon: Zap, color: "text-purple-400", bg: "bg-purple-400/10", gradient: "from-purple-400/20 to-purple-500/5" },
  };
  const c = colorMap[action.color] || colorMap.blue;
  const Icon = c.icon;

  return (
    <Link
      href={action.href}
      className={`group relative rounded-2xl p-5 transition-all duration-500 hover:scale-[1.02] ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${c.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      <div className="absolute inset-[1px] rounded-2xl bg-surface/90 backdrop-blur-xl" />
      <div className="relative z-10">
        <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${c.bg} mb-3 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`h-5 w-5 ${c.color}`} />
        </div>
        <h3 className="font-display text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
          {action.label}
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
      </div>
    </Link>
  );
}

export default function DashboardHome() {
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  });
  const { data, markAlertRead, markAllAlertsRead, addToCompare, removeFromCompare, clearCompare } = useDashboardData();

  const completedTasks = data.tasks.filter((t) => t.done).length;
  const totalTasks = data.tasks.length;
  const progressPct = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      {/* Smart Greeting Card */}
      <GreetingCard username="trendaryo206" />

      {/* Market Pulse Ticker */}
      <MarketPulseTicker items={data.ticker} />

      {/* [2] AI Product of the Day */}
      <AIDailyPick pick={data.dailyPick} />

      {/* [3] Revenue Forecast + Stats + Daily Mission */}
      <div className="space-y-6">
        <RevenueForecast
          actual={data.revenue.actual}
          predicted={data.revenue.predicted}
          stats={data.revenue.stats}
          username="trendaryo206"
        />
        <DailyMission mission={data.mission} />
      </div>

      {/* [4] Intelligence Hub */}
      <IntelligenceHub
        alerts={data.alerts}
        onRead={markAlertRead}
        onReadAll={markAllAlertsRead}
        briefing={data.briefing}
        pulse={data.pulse}
        actionStats={data.actionStats}
      />

      {/* [5] Niche Radar Cards */}
      <NicheRadarCards niches={data.niches} />

      {/* [8] Marketplace Heatmap + [10] Inline Calculator + Supplier Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <InlineCalculator />
        </div>
        <div className="lg:col-span-2">
          <SupplierStatusCards suppliers={data.suppliers} />
        </div>
      </div>

      {/* [8] Marketplace Heatmap */}
      <MarketplaceHeatmap categories={data.heatmap} />

      {/* Trending Products */}
      <TrendingProducts products={data.trending} onAddCompare={addToCompare} />

      {/* Getting Started */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold text-foreground">Getting Started</h3>
          <span className="text-xs text-muted-foreground">{completedTasks}/{totalTasks} completed</span>
        </div>

        <div className="h-2 rounded-full bg-surface overflow-hidden mb-6">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.tasks.map((tip, i) => (
            <Link
              key={i}
              href={tip.href}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface-hover transition-all group"
            >
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${tip.done ? "bg-emerald-400/10 border border-emerald-400/20" : "border border-border"}`}>
                {tip.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Target className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                )}
              </div>
              <span className={`text-sm ${tip.done ? "text-muted-foreground line-through" : "text-muted-foreground group-hover:text-foreground"} transition-colors`}>
                {tip.text}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all ml-auto" />
            </Link>
          ))}
        </div>
      </div>

      {/* [9] Quick Compare Bar */}
      <QuickCompareBar
        items={data.compareItems}
        onRemove={removeFromCompare}
        onClear={clearCompare}
      />
    </div>
  );
}
