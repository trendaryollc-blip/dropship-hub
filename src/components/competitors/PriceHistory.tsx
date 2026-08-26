"use client";

import { TrendingUp, Calendar } from "lucide-react";
import { useInView } from "@/hooks/useInView";

interface PricePoint {
  date: string;
  avg: number;
  min: number;
  max: number;
}

export default function PriceHistory({ data }: { data: PricePoint[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  if (!data || data.length === 0) {
    return (
      <div ref={ref} className={`glass rounded-2xl p-6 border border-border transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <p className="text-sm text-muted-foreground text-center">No price history data available</p>
      </div>
    );
  }
  const allPrices = data.flatMap((d) => [d.min, d.avg, d.max]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 1;
  const w = 500;
  const h = 120;
  const pad = 20;

  const toX = (i: number) => pad + (i / (data.length - 1)) * (w - 2 * pad);
  const toY = (v: number) => pad + ((maxP - v) / range) * (h - 2 * pad);

  const avgPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.avg)}`).join(" ");
  const minPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.min)}`).join(" ");
  const maxPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.max)}`).join(" ");
  const areaPath = `${avgPath} L${toX(data.length - 1)},${h - pad} L${toX(0)},${h - pad} Z`;

  const latestAvg = data[data.length - 1].avg;
  const prevAvg = data[data.length - 2]?.avg || latestAvg;
  const trendUp = latestAvg >= prevAvg;

  return (
    <div ref={ref} className={`glass rounded-2xl p-6 border border-border transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h3 className="font-display text-base font-semibold text-foreground truncate shrink-0">Price History (14 Days)</h3>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-accent rounded-full" /> Average</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400/50 rounded-full" /> Min</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400/50 rounded-full" /> Max</span>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
          <defs>
            <linearGradient id="avgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((pct) => (
            <g key={pct}>
              <line x1={pad} y1={pad + pct * (h - 2 * pad)} x2={w - pad} y2={pad + pct * (h - 2 * pad)} stroke="currentColor" className="text-border/30" strokeDasharray="4 4" />
              <text x={pad - 4} y={pad + pct * (h - 2 * pad) + 3} textAnchor="end" className="fill-muted-foreground text-[8px]">${(maxP - pct * range).toFixed(0)}</text>
            </g>
          ))}

          {data.map((d, i) => (
            <g key={i}>
              <line x1={toX(i)} y1={pad} x2={toX(i)} y2={h - pad} stroke="currentColor" className="text-border/10" />
              {i % 2 === 0 && <text x={toX(i)} y={h - 4} textAnchor="middle" className="fill-muted-foreground text-[7px]">{d.date}</text>}
            </g>
          ))}

          <path d={minPath} fill="none" stroke="currentColor" className="text-emerald-400/30" strokeWidth="1" />
          <path d={maxPath} fill="none" stroke="currentColor" className="text-red-400/30" strokeWidth="1" />
          <path d={areaPath} fill="url(#avgGrad)" />
          <path d={avgPath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          <circle cx={toX(data.length - 1)} cy={toY(latestAvg)} r="4" fill="var(--accent)" stroke="var(--background)" strokeWidth="2" />
        </svg>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
          <span>Current: <span className="text-foreground font-medium">${latestAvg.toFixed(2)}</span></span>
          <span className={`flex items-center gap-1 ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
            {trendUp ? "▲" : "▼"} {Math.abs(((latestAvg - prevAvg) / prevAvg) * 100).toFixed(1)}% vs yesterday
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Last 14 days
        </div>
      </div>
    </div>
  );
}
