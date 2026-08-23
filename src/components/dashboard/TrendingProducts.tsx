"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Package,
  Plus,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Users,
  Shield,
  Sparkles,
  Flame,
  ExternalLink,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { TrendingProduct } from "@/lib/mock-dashboard";

function MiniSparkline({ points, id }: { points: number[]; id: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const pts = points.map((p, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - ((p - min) / range) * h,
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`ts-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#ts-${id})`} />
      <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="#22c55e" />
    </svg>
  );
}

function ConfidenceRing({ score }: { score: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={40} height={40} viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" className="text-border" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 20 20)" className="transition-all duration-1000" />
        <text x="20" y="20" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[10px] font-bold">{score}</text>
      </svg>
      <span className="text-[9px] text-muted-foreground">AI Score</span>
    </div>
  );
}

function TrendingProductCard({ product, index, rank, onAddCompare }: {
  product: TrendingProduct;
  index: number;
  rank: number;
  onAddCompare: (item: { name: string; price: number; margin: number; image: string }) => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const [expanded, setExpanded] = useState(false);

  const rankGradients = [
    "from-yellow-400 to-amber-500",
    "from-slate-300 to-slate-400",
    "from-orange-400 to-orange-500",
    "from-blue-400/60 to-blue-500",
    "from-purple-400/60 to-purple-500",
  ];
  const rankBg = rankGradients[Math.min(rank - 1, rankGradients.length - 1)];

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

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground">{product.platform}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${demand.cls}`}>{demand.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${comp.cls}`}>{comp.label}</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block shrink-0">
            <MiniSparkline points={product.sparkline} id={`rank-${rank}`} />
          </div>

          <div className="hidden md:block shrink-0">
            <ConfidenceRing score={product.confidence} />
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
            <button
              onClick={(e) => { e.stopPropagation(); onAddCompare({ name: product.name, price: product.price, margin: product.margin, image: "https://placehold.co/60x60/0f0f17/3b82f6?text=P" }); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
              title="Add to compare"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-border/50 px-4 sm:px-5 pb-4 sm:pb-5 pt-4 space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-accent/5 border border-accent/10">
              <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">{product.whyTrending}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[10px] text-muted-foreground">Monthly Vol</span>
                </div>
                <p className="text-sm font-bold text-foreground">{product.monthlyVolume.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[10px] text-muted-foreground">Supplier Rel.</span>
                </div>
                <p className="text-sm font-bold text-foreground">{product.supplierReliability}%</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-[10px] text-muted-foreground">AI Score</span>
                </div>
                <p className="text-sm font-bold text-foreground">{product.confidence}/100</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[10px] text-muted-foreground">Price Range</span>
                </div>
                <p className="text-sm font-bold text-foreground">${product.price.toFixed(2)} - ${product.sellPrice.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Top Competitors</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {product.competitors.map((comp, ci) => (
                  <Link key={ci} href="/products" className="flex items-center justify-between p-2.5 rounded-lg bg-surface/50 border border-border/50 hover:border-accent/20 hover:bg-surface-hover transition-all">
                    <span className="text-xs text-foreground truncate">{comp.name}</span>
                    <span className="text-xs font-semibold text-muted-foreground shrink-0">${comp.price.toFixed(2)}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">AI Listing Suggestion</p>
              <p className="text-xs font-semibold text-foreground">{product.listingSuggestion.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{product.listingSuggestion.description}</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href="/products"
                className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Full Analysis
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); onAddCompare({ name: product.name, price: product.price, margin: product.margin, image: "https://placehold.co/60x60/0f0f17/3b82f6?text=P" }); }}
                className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-surface/50 hover:bg-surface-hover text-foreground text-xs font-semibold transition-colors border border-border/50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add to Compare
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrendingProducts({
  products,
  onAddCompare,
}: {
  products: TrendingProduct[];
  onAddCompare: (item: { name: string; price: number; margin: number; image: string }) => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent-warm" />
          <h3 className="font-display text-sm font-semibold text-foreground">Trending Products</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-warm/10 text-accent-warm font-medium animate-pulse-badge">
            {products.length} hot
          </span>
        </div>
        <Link href="/products" className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {products.map((product, i) => (
          <TrendingProductCard
            key={product.name}
            product={product}
            index={i}
            rank={i + 1}
            onAddCompare={onAddCompare}
          />
        ))}
      </div>
    </div>
  );
}
