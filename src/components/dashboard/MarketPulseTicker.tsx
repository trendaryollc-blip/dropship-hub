"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import type { TickerItem } from "@/lib/mock-dashboard";

function MiniSparkline({ points, positive }: { points: number[]; positive: boolean }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const h = 20;
  const w = 60;

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-${positive ? "pos" : "neg"}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={positive ? "#22c55e" : "#ef4444"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? "#22c55e" : "#ef4444"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${positive ? "pos" : "neg"})`} />
      <path d={path} fill="none" stroke={positive ? "#22c55e" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function MarketPulseTicker({ items }: { items: TickerItem[] }) {
  const doubled = [...items, ...items];

  return (
    <div className="w-full overflow-hidden border-b border-border bg-surface/30 backdrop-blur-sm">
      <div className="flex items-center">
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-r border-border bg-surface/50">
          <Activity className="h-3.5 w-3.5 text-accent animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Live</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex items-center gap-0 animate-ticker whitespace-nowrap">
            {doubled.map((item, i) => {
              const positive = item.change >= 0;
              return (
                <Link key={i} href="/products" className="inline-flex items-center gap-2.5 px-4 py-2.5 shrink-0 hover:bg-surface/50 transition-colors">
                  <span className="text-xs font-medium text-foreground">{item.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground">
                    {item.platform}
                  </span>
                  <span className="text-xs font-bold text-foreground">${item.price.toFixed(2)}</span>
                  <MiniSparkline points={item.sparkline} positive={positive} />
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${positive ? "text-emerald-400" : "text-red-400"}`}>
                    {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {positive ? "+" : ""}{item.change}%
                  </span>
                  <span className="text-border mx-1">|</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
