"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles, ArrowUpRight, Shield, TrendingUp, DollarSign,
  Target, ShoppingCart, Layers, Clock, CheckCircle2,
  BookmarkPlus, BookmarkCheck, Star, Package, ChevronRight,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { AIDailyPick as AIDailyPickType } from "@/types/dashboard";

function OpportunityRing({ score, size = 72 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke="url(#scoreGradient)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
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
        <span className="font-display text-lg font-bold text-foreground">{score}</span>
        <span className="text-[7px] text-muted-foreground uppercase tracking-wider">/100</span>
      </div>
    </div>
  );
}

function useCountdown(target: string) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expired"); return; }
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
  medium: { label: "Med Risk", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Target },
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
      className={`relative glass-card-animated rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-accent/[0.04] rounded-full blur-[80px]" />

      <div className="relative z-10 p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="animate-pulse-badge flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 border border-accent/30">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
            </div>
            <h2 className="font-display text-sm font-bold text-foreground">AI Pick of the Day</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {pick.yesterdayPick && (
              <div className={`flex items-center gap-1 px-1.5 py-1 rounded-full text-[9px] font-medium border ${pick.yesterdayPick.up ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : "text-red-400 bg-red-400/10 border-red-400/20"}`}>
                <CheckCircle2 className="h-2 w-2" />
                Yesterday: {pick.yesterdayPick.result}
              </div>
            )}
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-surface border border-border text-[9px] font-medium text-muted-foreground">
              <Clock className="h-2 w-2" />
              {timeLeft}
            </div>
          </div>
        </div>

        {/* Main Content: Image Left + Details Right */}
        <div className="flex gap-4 mb-3 flex-1 min-h-0">
          {/* Left: Large Product Image */}
          <Link href="/products" className="group relative block w-[45%] shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-accent/10 via-purple-500/5 to-accent/10">
            {showImage && (
              <img src={pick.image} alt={pick.title}
                className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImgLoaded(true)} onError={() => setImgFailed(true)} loading="eager" />
            )}
            {(!showImage || !imgLoaded) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Package className="h-16 w-16 text-accent/30" />
                <span className="text-[10px] text-muted-foreground/50 text-center px-2">{pick.title}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute top-3 left-3 animate-pulse-badge px-2 py-1 rounded-full bg-accent text-white text-[9px] font-bold uppercase shadow-lg shadow-accent/30">
              AI Pick
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-semibold text-white">{pick.overallScore >= 80 ? "4.9" : pick.overallScore >= 60 ? "4.7" : "4.5"}</span>
                </div>
                <div className="px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                  <span className="text-[10px] font-semibold text-white">{pick.platform}</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Right: Details + Score */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Title + Badges */}
            <div className="mb-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Link href="/products" className="px-2 py-0.5 rounded bg-accent/10 text-accent text-[9px] font-bold uppercase hover:bg-accent/20 transition-colors">{pick.category}</Link>
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-medium border ${risk.color}`}>
                  <RiskIcon className="h-2.5 w-2.5" />{risk.label}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-foreground leading-tight line-clamp-2">{pick.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-1">{pick.description}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-1 mb-0.5">
                  <DollarSign className="h-3 w-3 text-emerald-400" />
                  <span className="text-[8px] text-muted-foreground uppercase">Margin</span>
                </div>
                <p className="font-display text-sm font-bold text-foreground">{pick.margin ?? 0}%</p>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-1 mb-0.5">
                  <ShoppingCart className="h-3 w-3 text-blue-400" />
                  <span className="text-[8px] text-muted-foreground uppercase">Orders/mo</span>
                </div>
                <p className="font-display text-sm font-bold text-foreground">{((pick.ordersPerMonth ?? 0) / 1000).toFixed(1)}K</p>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-1 mb-0.5">
                  <Layers className="h-3 w-3 text-amber-400" />
                  <span className="text-[8px] text-muted-foreground uppercase">Saturation</span>
                </div>
                <p className="font-display text-sm font-bold text-foreground">{pick.saturation ?? 0}%</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
                <div className="flex items-center gap-1 mb-0.5">
                  <DollarSign className="h-3 w-3 text-emerald-400" />
                  <span className="text-[8px] text-emerald-400/70 uppercase">Profit/unit</span>
                </div>
                <p className="font-display text-sm font-bold text-emerald-400">${(pick.earningsPreview.profitPerOrder ?? 0).toFixed(0)}</p>
              </div>
            </div>

            {/* Opportunity Score */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface/50 border border-border mt-auto">
              <OpportunityRing score={pick.overallScore ?? 0} size={52} />
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-foreground mb-0.5">Opportunity Score</p>
                <p className="text-[10px] text-muted-foreground">
                  {(pick.overallScore ?? 0) >= 80 ? "Excellent opportunity - act fast!" : (pick.overallScore ?? 0) >= 60 ? "Good opportunity with solid potential" : "Moderate opportunity - proceed carefully"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Why AI + Earnings + Actions */}
        <div className="grid grid-cols-3 gap-3">
          {/* Why AI picked this */}
          <div className="p-2.5 rounded-xl bg-surface/50 border border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-semibold text-foreground">Why AI picked this</span>
            </div>
            <div className="space-y-1.5">
              {pick.reasonPoints.slice(0, 3).map((point, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <ChevronRight className="h-2.5 w-2.5 text-accent mt-0.5 shrink-0" />
                  <span className="text-[9px] text-muted-foreground leading-snug">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Earnings */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-400/20">
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-foreground">Earnings</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">Source</span>
                <span className="text-[11px] font-bold text-foreground">${(pick.sourcePrice ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground">Sell at</span>
                <span className="text-[11px] font-bold text-foreground">${(pick.sellPrice ?? 0).toFixed(2)}</span>
              </div>
              <div className="h-px bg-emerald-400/10" />
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-emerald-400/80">Monthly est.</span>
                <span className="text-xs font-bold text-emerald-400">${(pick.earningsPreview.monthlyRevenue ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Link href="/products"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-accent text-white text-[11px] font-semibold hover:bg-accent-hover transition-all hover:shadow-[0_0_20px_rgba(var(--glow-color),0.3)] active:scale-[0.97]">
              Start Selling <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <button onClick={() => setWatchlisted(!watchlisted)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-medium transition-all ${watchlisted ? "border-accent/30 bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover"}`}>
              {watchlisted ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
              {watchlisted ? "Watching" : "Watchlist"}
            </button>
            <Link href="/calculator"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all">
              <DollarSign className="h-3.5 w-3.5" /> Compare
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
