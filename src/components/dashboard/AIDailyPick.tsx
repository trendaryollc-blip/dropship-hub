"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowUpRight,
  Shield,
  TrendingUp,
  DollarSign,
  Target,
  ShoppingCart,
  Layers,
  Clock,
  CheckCircle2,
  ChevronRight,
  BookmarkPlus,
  BookmarkCheck,
  Star,
  Package,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { AIDailyPick as AIDailyPickType } from "@/types/dashboard";

function OpportunityRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-[130px] h-[130px]">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-warm)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold text-foreground">{score}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  );
}

function useCountdown(target: string) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  return timeLeft;
}

const riskConfig = {
  low: { label: "Low Risk", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: Shield },
  medium: { label: "Medium Risk", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Target },
  high: { label: "High Risk", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: Target },
};

export default function AIDailyPick({ pick }: { pick: AIDailyPickType }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const risk = riskConfig[pick.risk];
  const RiskIcon = risk.icon;
  const timeLeft = useCountdown(pick.expiresAt);
  const [watchlisted, setWatchlisted] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = pick.image && pick.image.trim() !== "" && !imgFailed;

  return (
    <div
      ref={ref}
      className={`relative glass-card-animated rounded-2xl overflow-hidden transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-accent/[0.04] rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-purple-500/[0.03] rounded-full blur-[100px]" />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {/* Header - centered title with badges on right */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="animate-pulse-badge flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 border border-accent/30">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                AI Product of the Day
                <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider">
                  Curated
                </span>
              </h2>
              <p className="text-[11px] text-muted-foreground">Handpicked by AI based on market trends, margins, and opportunity</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {pick.yesterdayPick && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border cursor-pointer hover:opacity-80 transition-opacity ${pick.yesterdayPick.up ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-red-400 bg-red-400/10 border-red-400/20"}`}>
                <CheckCircle2 className="h-3 w-3" />
                Yesterday: {pick.yesterdayPick.result}
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-[11px] font-medium text-muted-foreground">
              <Clock className="h-3 w-3" />
              Refreshes in {timeLeft}
            </div>
          </div>
        </div>

        {/* Product showcase - Full width layout */}
        <div className="flex flex-col lg:flex-row gap-0 mb-6 rounded-2xl overflow-hidden border border-white/10 bg-surface/50">
          {/* Left: Product Image (fills available space) */}
          <Link href="/products" className="group relative block lg:w-[55%] shrink-0">
            <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full min-h-[280px] lg:min-h-[340px] overflow-hidden bg-gradient-to-br from-accent/10 via-purple-500/5 to-accent/10">
              {showImage && (
                <img
                  src={pick.image}
                  alt={pick.title}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgFailed(true)}
                  loading="eager"
                />
              )}
              {(!showImage || !imgLoaded) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Package className="h-20 w-20 text-accent/30" />
                  <span className="text-xs text-muted-foreground/50">{pick.title}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute top-4 left-4 animate-pulse-badge px-3 py-1.5 rounded-full bg-accent text-white text-[11px] font-bold uppercase shadow-lg shadow-accent/30">
                AI Pick
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-semibold text-white">{pick.overallScore >= 80 ? "4.9" : pick.overallScore >= 60 ? "4.7" : "4.5"}</span>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
                    <span className="text-xs font-semibold text-white">{pick.platform}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Right: Product Details (flex to fill remaining space) */}
          <div className="lg:w-[45%] p-5 lg:p-6 flex flex-col justify-between">
            <div>
              <Link href="/products" className="inline-block px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider mb-3 hover:bg-accent/20 transition-colors">
                {pick.category}
              </Link>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight mb-2">{pick.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{pick.description}</p>

              <div className="flex flex-wrap gap-2 mb-5">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border ${risk.color}`}>
                  <RiskIcon className="h-3 w-3" />
                  {risk.label}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-[11px] font-medium text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  {pick.platform}
                </span>
              </div>

              {/* Stats Grid - 2x2 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Margin</span>
                  </div>
                  <p className="font-display text-xl font-bold text-foreground">{pick.margin ?? 0}%</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-4 w-4 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Orders/mo</span>
                  </div>
                  <p className="font-display text-xl font-bold text-foreground">{((pick.ordersPerMonth ?? 0) / 1000).toFixed(1)}K</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="h-4 w-4 text-amber-400" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Saturation</span>
                  </div>
                  <p className="font-display text-xl font-bold text-foreground">{pick.saturation ?? 0}%</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-400/10 border border-emerald-400/20">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400/70 uppercase tracking-wider">Profit/unit</span>
                  </div>
                  <p className="font-display text-xl font-bold text-emerald-400">${(pick.earningsPreview.profitPerOrder ?? 0).toFixed(0)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why AI picked this */}
        <div className="p-4 rounded-xl bg-surface/50 border border-border mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold text-foreground">Why AI picked this</span>
          </div>
          <div className="space-y-2">
            {pick.reasonPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <ChevronRight className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                <span className="text-[13px] text-muted-foreground leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all hover:shadow-[0_0_20px_rgba(var(--glow-color),0.3)] active:scale-[0.97]"
          >
            Start Selling This
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setWatchlisted(!watchlisted)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${watchlisted ? "border-accent/30 bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}
          >
            {watchlisted ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
            {watchlisted ? "Watching" : "Watchlist"}
          </button>
          <Link
            href="/calculator"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
          >
            <DollarSign className="h-4 w-4" />
            Compare
          </Link>
        </div>

        {/* Opportunity Score + Earnings - Side by side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-surface/50 border border-border flex flex-col items-center">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Opportunity Score</span>
            <OpportunityRing score={pick.overallScore ?? 0} />
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {(pick.overallScore ?? 0) >= 80
                ? "Excellent opportunity - strong across all metrics"
                : (pick.overallScore ?? 0) >= 60
                ? "Good opportunity - some areas to watch"
                : "Moderate opportunity - proceed with research"}
            </p>
          </div>

          <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-400/20">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-foreground">What you would earn</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Buy at (source)</span>
                <span className="text-sm font-bold text-foreground">${(pick.sourcePrice ?? 0).toFixed(2)}</span>
              </div>
              <div className="h-px bg-emerald-400/10" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Sell at</span>
                <span className="text-sm font-bold text-foreground">${(pick.sellPrice ?? 0).toFixed(2)}</span>
              </div>
              <div className="h-px bg-emerald-400/10" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-400/80">Profit per order</span>
                <span className="text-sm font-bold text-emerald-400">${(pick.earningsPreview.profitPerOrder ?? 0).toFixed(2)}</span>
              </div>
              <div className="h-px bg-emerald-400/10" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Volume</span>
                <span className="text-sm font-medium text-foreground">{pick.earningsPreview.ordersPerMonth ?? 0} orders/mo</span>
              </div>
              <div className="h-px bg-emerald-400/20" />
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-emerald-400">Est. monthly profit</span>
                <span className="text-lg font-bold text-emerald-400">${(pick.earningsPreview.monthlyRevenue ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
