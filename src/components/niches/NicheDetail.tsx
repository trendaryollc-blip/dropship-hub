"use client";

import Image from "next/image";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, Flame, Target, BarChart3,
  Shield, Zap, ArrowRight, ShoppingCart, Users, Globe,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { NicheData } from "@/lib/mock-niches";

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-bold text-foreground">{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-surface overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#3b82f6" : score >= 30 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}

function MiniSparkline({ points, color = "#3b82f6" }: { points: number[]; color?: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 100, h = 28;
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (points.length - 1)) * w} ${h - ((p - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id="ndGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L ${w} ${h} L 0 ${h} Z`} fill="url(#ndGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const badgeColors: Record<string, string> = {
  gold: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  silver: "text-slate-300 bg-slate-300/10 border-slate-300/20",
  bronze: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

export default function NicheDetail({ niche }: { niche: NicheData }) {
  const { ref: heroRef, isInView: heroVisible } = useInView({ threshold: 0.1 });
  const { ref: scoresRef, isInView: scoresVisible } = useInView({ threshold: 0.1 });
  const heatColor = niche.heat >= 80 ? "#ef4444" : niche.heat >= 60 ? "#f59e0b" : "#3b82f6";
  const trendColor = niche.trend === "up" ? "text-emerald-400" : niche.trend === "down" ? "text-red-400" : "text-muted-foreground";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div ref={heroRef} className={`glass rounded-2xl border border-border p-6 transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-border shrink-0">
            <Image src={niche.image} alt={niche.name} width={64} height={64} unoptimized className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">{niche.name}</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${niche.grade.startsWith("A") ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : niche.grade.startsWith("B") ? "text-blue-400 bg-blue-400/10 border-blue-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>{niche.grade}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${niche.riskLevel === "low" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : niche.riskLevel === "medium" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-red-400 bg-red-400/10 border-red-400/20"}`}>{niche.riskLevel} risk</span>
            </div>
            <p className="text-sm text-foreground/80 mb-4">{niche.aiInsight}</p>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <ScoreRing score={niche.overallScore} size={48} />
                <div>
                  <p className="text-[10px] text-muted-foreground">Overall Score</p>
                  <p className="text-sm font-bold text-foreground">{niche.overallScore}/100</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="h-5 w-5" style={{ color: heatColor }} />
                <span className="font-display text-2xl font-bold" style={{ color: heatColor }}>{niche.heat}</span>
                <span className="text-xs text-muted-foreground">heat</span>
              </div>
              <div className={`flex items-center gap-1 ${trendColor}`}>
                {niche.trend === "up" ? <TrendingUp className="h-4 w-4" /> : niche.trend === "down" ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                <span className="text-sm font-bold">+{niche.growth}% growth</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div ref={scoresRef} className={`glass rounded-2xl border border-border p-6 transition-all duration-700 ${scoresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h3 className="font-display text-sm font-semibold text-foreground">Niche Scores</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <ScoreBar label="Demand" score={niche.scores.demand} color="#3b82f6" />
            <ScoreBar label="Profit Potential" score={niche.scores.profit} color="#22c55e" />
            <ScoreBar label="Competition" score={niche.scores.competition} color="#f59e0b" />
            <ScoreBar label="Trend" score={niche.scores.trend} color="#a855f7" />
            <ScoreBar label="Seasonality" score={niche.scores.seasonality} color="#ec4899" />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: ShoppingCart, label: "Products", value: niche.productCount.toLocaleString(), color: "text-blue-400" },
                { icon: TrendingUp, label: "Avg Margin", value: `${niche.avgMargin}%`, color: "text-emerald-400" },
                { icon: Users, label: "Saturation", value: `${niche.saturation}%`, color: niche.saturation > 60 ? "text-red-400" : "text-emerald-400" },
                { icon: Globe, label: "Top Platforms", value: niche.bestPlatforms.join(", "), color: "text-accent" },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-xl bg-surface/50 border border-border/50">
                  <stat.icon className={`h-4 w-4 ${stat.color} mb-1`} />
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  <p className="text-xs font-bold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground mb-1">Demand Trend</p>
              <MiniSparkline points={niche.demandSparkline} color={heatColor} />
            </div>
          </div>
        </div>
      </div>

      {/* Top Product + Seasonality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-amber-400" />
            <h3 className="font-display text-sm font-semibold text-foreground">Top Product</h3>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{niche.topProduct}</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground">Source Price</p>
                <p className="text-lg font-bold text-accent">${niche.topProductPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Margin</p>
                <p className="text-lg font-bold text-emerald-400">{niche.topProductMargin}%</p>
              </div>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-purple-400" />
            <h3 className="font-display text-sm font-semibold text-foreground">Seasonality</h3>
          </div>
          <p className="text-xs text-foreground/80 mb-3">{niche.seasonality}</p>
          <div className="flex flex-wrap gap-1.5">
            {niche.keywords.map((kw) => (
              <span key={kw} className="text-[10px] px-2 py-1 rounded-lg bg-surface/50 border border-border/50 text-muted-foreground">{kw}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Suppliers */}
      <div className="glass rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-emerald-400" />
          <h3 className="font-display text-sm font-semibold text-foreground">Top Suppliers for This Niche</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {niche.topSuppliers.map((s) => (
            <Link key={s.name} href="/suppliers" className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border/50 hover:border-accent/20 transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border flex items-center justify-center font-display text-sm font-bold text-foreground shrink-0">
                {s.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${badgeColors[s.badge]}`}>{s.badge}</span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-foreground">{s.reliability}%</p>
                <p className="text-[8px] text-muted-foreground">Reliability</p>
              </div>
            </Link>
          ))}
        </div>
        <Link href={`/suppliers?category=${encodeURIComponent(niche.category)}`} className="w-full flex items-center justify-center gap-1.5 mt-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all">
          View All Suppliers <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Related Niches */}
      <div className="glass rounded-2xl border border-border p-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3">Related Niches</h3>
        <div className="flex flex-wrap gap-2">
          {niche.relatedNiches.map((rn) => (
            <span key={rn} className="text-xs px-3 py-1.5 rounded-lg bg-surface/50 border border-border text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all cursor-pointer">{rn}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
