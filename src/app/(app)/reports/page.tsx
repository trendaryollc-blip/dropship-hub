"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart, Package,
  BarChart3, PieChart, Download, Activity, Target, RefreshCw,
  FileText, Zap, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
  Calendar,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { KPICardSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "pnl" | "products" | "platforms" | "trends" | "insights";
type SortField = "date" | "revenue" | "profit" | "costs" | "orders" | "margin";
type SortDir = "asc" | "desc";

interface DailyBreakdown {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
  costs: number;
}

interface ProductPerformance {
  productTitle: string;
  productImage: string;
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  profitMargin: number;
  trend: number | null;
  status: "profitable" | "breakeven" | "losing";
}

interface CostBreakdownItem {
  name: string;
  value: number;
  pct: number;
  color: string;
}

interface CampaignProfit {
  campaignName: string;
  adSpend: number;
  revenue: number;
  profit: number;
  roas: number;
  orders: number;
}

interface ProfitResponse {
  summary?: {
    totalRevenue: number;
    totalProfit: number;
    totalCosts: number;
    avgMargin: number;
    refundRate: number;
    totalOrders: number;
    topProducts: ProductPerformance[];
  };
  dailyBreakdown?: DailyBreakdown[];
  topProducts?: ProductPerformance[];
  costBreakdown?: CostBreakdownItem[];
  campaignProfits?: CampaignProfit[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripHash(color: string): string {
  return color.replace("#", "");
}

function calcTrend(data: number[]): { change: string; up: boolean } {
  if (data.length < 2) return { change: "0%", up: true };
  const half = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondHalf = data.slice(half).reduce((a, b) => a + b, 0) / (data.length - half);
  if (firstHalf === 0) return { change: "+0%", up: true };
  const pct = ((secondHalf - firstHalf) / firstHalf) * 100;
  return { change: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, up: pct >= 0 };
}

function formatCurrency(val: number): string {
  if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

function getSparklineColor(color: string): string {
  if (color === "text-emerald-400") return "#22c55e";
  if (color === "text-blue-400") return "#3b82f6";
  if (color === "text-amber-400") return "#f59e0b";
  return "#a855f7";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const w = 80;
  const h = 28;
  if (points.length < 2) {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      </svg>
    );
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const gradId = `rpt-spk-${stripHash(color)}-${points.length}`;
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
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KPICard({
  label, value, prefix, suffix, change, up, icon: Icon, color, sparkline, delay,
}: {
  label: string; value: number; prefix?: string; suffix?: string;
  change: string; up: boolean; icon: typeof DollarSign;
  color: string; sparkline: number[]; delay: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useAnimatedCounter(value, 1500, isInView);
  return (
    <div
      ref={ref}
      className={`glass rounded-xl p-3 sm:p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg ${color}/10 group-hover:scale-110 transition-transform`}>
          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color}`} />
        </div>
        <span className={`flex items-center gap-0.5 text-[10px] sm:text-[11px] font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
          {change}
        </span>
      </div>
      <p className="font-display text-lg sm:text-2xl font-bold text-foreground">
        {prefix || ""}{count.toLocaleString()}{suffix || ""}
      </p>
      <div className="flex items-center justify-between mt-1.5 sm:mt-2">
        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate pr-2">{label}</p>
        <MiniSparkline points={sparkline} color={getSparklineColor(color)} />
      </div>
    </div>
  );
}

function RevenueProfitChart({ data }: { data: DailyBreakdown[] }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; y2: number; date: string; revenue: number; profit: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.revenue), 0);
  const minVal = Math.min(...data.map((d) => d.profit), 0);
  const range = maxVal - minVal || 1;
  const padding = { top: 20, right: 15, bottom: 30, left: 45 };
  const w = 800;
  const h = 280;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const getX = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - ((val - minVal) / range) * chartH;

  const revenuePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.revenue)}`).join(" ");
  const profitPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.profit)}`).join(" ");
  const revenueArea = `${revenuePath} L ${getX(data.length - 1)} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;
  const profitArea = `${profitPath} L ${getX(data.length - 1)} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(minVal + range * p));

  const bestDay = data.reduce((best, d) => d.profit > best.profit ? d : best, data[0]);
  const worstDay = data.reduce((worst, d) => d.profit < worst.profit ? d : worst, data[0]);
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalProfit = data.reduce((s, d) => s + d.profit, 0);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round(((x - padding.left) / chartW) * (data.length - 1));
    if (idx >= 0 && idx < data.length) {
      setTooltip({ x: getX(idx), y: getY(data[idx].revenue), y2: getY(data[idx].profit), date: data[idx].date, revenue: data[idx].revenue, profit: data[idx].profit });
    }
  };

  const labelInterval = Math.max(Math.ceil(data.length / 7), 1);
  const dotIndices = data.reduce<number[]>((acc, _, i) => { if (i % 5 === 0 || i === data.length - 1) acc.push(i); return acc; }, []);

  return (
    <div ref={ref} className={`glass rounded-2xl p-3 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Revenue & Profit Trend</h3>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground">Daily revenue vs profit over time</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-blue-500" /><span className="text-muted-foreground">Revenue</span></span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-emerald-400" /><span className="text-muted-foreground">Profit</span></span>
        </div>
      </div>
      <div className="relative">
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
          <defs>
            <linearGradient id="rpt-revGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rpt-profitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={padding.left} y1={getY(tick)} x2={w - padding.right} y2={getY(tick)} stroke="rgba(255,255,255,0.04)" />
              <text x={padding.left - 6} y={getY(tick) + 3} textAnchor="end" className="fill-muted-foreground text-[8px] sm:text-[9px]">${tick}</text>
            </g>
          ))}
          {isInView && <path d={revenueArea} fill="url(#rpt-revGrad)" className="animate-fade-in" />}
          {isInView && <path d={profitArea} fill="url(#rpt-profitGrad)" className="animate-fade-in" />}
          {isInView && <path d={revenuePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" className="animate-chart-draw" />}
          {isInView && <path d={profitPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" className="animate-chart-draw" style={{ animationDelay: "0.5s" }} />}
          {dotIndices.map((idx) => (
            <circle key={idx} cx={getX(idx)} cy={getY(data[idx].revenue)} r="3" fill="#3b82f6" stroke="#0f0f17" strokeWidth="2" />
          ))}
          {tooltip && (() => {
            const tooltipY = Math.max(Math.min(tooltip.y, tooltip.y2) - 42, padding.top);
            const tooltipX = Math.max(60, Math.min(tooltip.x, w - padding.right - 60));
            return (
              <g>
                <line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={padding.top + chartH} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                <circle cx={tooltip.x} cy={tooltip.y} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
                <circle cx={tooltip.x} cy={tooltip.y2} r="4" fill="#22c55e" stroke="#fff" strokeWidth="2" />
                <rect x={tooltipX - 60} y={tooltipY} width="120" height="36" rx="6" fill="#16161f" stroke="rgba(255,255,255,0.1)" />
                <text x={tooltipX} y={tooltipY + 14} textAnchor="middle" className="fill-foreground text-[9px] font-bold">Rev: ${tooltip.revenue.toFixed(0)}</text>
                <text x={tooltipX} y={tooltipY + 26} textAnchor="middle" className="fill-emerald-400 text-[9px] font-bold">P: ${tooltip.profit.toFixed(0)}</text>
              </g>
            );
          })()}
          {data.reduce<{ d: DailyBreakdown; idx: number }[]>((acc, d, i) => { if (i % labelInterval === 0 || i === data.length - 1) acc.push({ d, idx: i }); return acc; }, []).map(({ d, idx }) => (
              <text key={idx} x={getX(idx)} y={h - 8} textAnchor="middle" className="fill-muted-foreground text-[7px] sm:text-[8px]">{d.date.slice(5)}</text>
            ))}
        </svg>
      </div>
      {/* Chart summary stats */}
      {data.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/5">
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase">Best Day</p>
            <p className="text-[11px] font-bold text-emerald-400">${bestDay.profit.toFixed(0)}</p>
            <p className="text-[9px] text-muted-foreground">{bestDay.date.slice(5)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase">Worst Day</p>
            <p className={`text-[11px] font-bold ${worstDay.profit >= 0 ? "text-foreground" : "text-red-400"}`}>${worstDay.profit.toFixed(0)}</p>
            <p className="text-[9px] text-muted-foreground">{worstDay.date.slice(5)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase">Avg Daily Rev</p>
            <p className="text-[11px] font-bold text-blue-400">${(totalRevenue / data.length).toFixed(0)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase">Avg Daily Profit</p>
            <p className={`text-[11px] font-bold ${totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>${(totalProfit / data.length).toFixed(0)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CostDonut({ data }: { data: CostBreakdownItem[] }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const size = 160;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = data.reduce<Array<CostBreakdownItem & { offset: number; dash: number }>>((acc, d) => {
    const prevOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    const dash = total > 0 ? (d.value / total) * circumference : 0;
    acc.push({ ...d, offset: prevOffset, dash });
    return acc;
  }, []);

  return (
    <div ref={ref} className={`flex flex-col items-center transition-all duration-700 ${isInView ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          {segments.map((seg) => (
            <circle key={seg.name} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`} strokeDashoffset={-seg.offset}
              className="transition-all duration-1000" />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold text-foreground">{formatCurrency(total)}</span>
          <span className="text-[9px] text-muted-foreground">Total Costs</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-1.5 mt-4 w-full">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{d.name}</span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-foreground ml-auto">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformDonut({ platforms, totalRevenue }: { platforms: { name: string; revenue: number; orders: number; share: number; color: string }[]; totalRevenue: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const size = 140;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = platforms.map((p, i) => {
    const offset = platforms.slice(0, i).reduce((sum, prev) => sum + prev.share, 0);
    return { ...p, offset, dash: (p.share / 100) * circumference };
  });

  return (
    <div ref={ref} className={`flex flex-col items-center transition-all duration-700 ${isInView ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          {segments.map((seg, i) => (
            <circle key={seg.name} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`} strokeDashoffset={-seg.offset * (circumference / 100)}
              className="transition-all duration-1000" style={{ transitionDelay: `${i * 150}ms` }} />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold text-foreground">{formatCurrency(totalRevenue)}</span>
          <span className="text-[9px] text-muted-foreground">Total</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-1 sm:gap-y-1.5 mt-3 sm:mt-4">
        {platforms.map((p) => (
          <div key={p.name} className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-[10px] sm:text-[11px] text-muted-foreground">{p.name}</span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-foreground">{p.share}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductRow({ product, rank, delay, maxRevenue }: { product: ProductPerformance; rank: number; delay: number; maxRevenue: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const statusColors = { profitable: "text-emerald-400 bg-emerald-400/10", breakeven: "text-amber-400 bg-amber-400/10", losing: "text-red-400 bg-red-400/10" };
  const barWidth = maxRevenue > 0 ? (product.totalRevenue / maxRevenue) * 100 : 0;
  return (
    <div ref={ref} className={`p-2.5 sm:p-3 rounded-xl hover:bg-surface-hover transition-all ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground w-4">{rank}</span>
        <span className="text-base sm:text-xl">{product.productImage || "📦"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm font-medium text-foreground truncate">{product.productTitle}</p>
            <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold ${statusColors[product.status]}`}>{product.status}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">{product.totalOrders} orders</span>
            {typeof product.trend === "number" && Number.isFinite(product.trend) ? (
              <span className={`text-[9px] sm:text-[10px] font-semibold ${product.trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>{product.trend >= 0 ? "+" : ""}{product.trend}%</span>
            ) : (
              <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground">—</span>
            )}
          </div>
          {/* Revenue bar */}
          <div className="h-1 rounded-full bg-surface overflow-hidden mt-1.5">
            <div className="h-full rounded-full bg-accent/40 transition-all duration-700" style={{ width: `${barWidth}%` }} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-xs sm:text-sm font-bold ${product.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>${product.totalProfit.toFixed(2)}</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">{product.profitMargin}% margin</p>
        </div>
      </div>
    </div>
  );
}

function CampaignRow({ campaign, delay }: { campaign: CampaignProfit; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const roasColor = campaign.roas >= 3 ? "text-emerald-400" : campaign.roas >= 1.5 ? "text-amber-400" : "text-red-400";
  const roasBg = campaign.roas >= 3 ? "bg-emerald-400/10" : campaign.roas >= 1.5 ? "bg-amber-400/10" : "bg-red-400/10";
  return (
    <div ref={ref} className={`flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover transition-all ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{campaign.campaignName}</p>
        <div className="flex items-center gap-2">
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">${campaign.adSpend.toFixed(2)} spend</span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">{campaign.orders} orders</span>
        </div>
      </div>
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${roasColor} ${roasBg}`}>{campaign.roas}x ROAS</span>
      <div className="text-right shrink-0">
        <p className={`text-xs sm:text-sm font-bold ${campaign.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>${campaign.profit.toFixed(2)}</p>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground">profit</p>
      </div>
    </div>
  );
}

function InsightCard({ icon: Icon, title, description, type, delay }: { icon: typeof TrendingUp; title: string; description: string; type: "success" | "warning" | "info"; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const colors = {
    success: { bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: "text-emerald-400" },
    warning: { bg: "bg-amber-400/10", border: "border-amber-400/20", icon: "text-amber-400" },
    info: { bg: "bg-blue-400/10", border: "border-blue-400/20", icon: "text-blue-400" },
  };
  const c = colors[type];
  return (
    <div ref={ref} className={`p-3 sm:p-4 rounded-xl ${c.bg} border ${c.border} transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg ${c.bg} shrink-0`}>
          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${c.icon}`} />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs sm:text-sm font-semibold text-foreground mb-0.5">{title}</h4>
          <p className="text-[11px] sm:text-[12px] text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

function PnLRow({ label, value, isNegative, isPositive, indent }: { label: string; value: string; isNegative?: boolean; isPositive?: boolean; indent?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-hover transition-colors ${indent ? "pl-8" : ""}`}>
      <span className={`text-xs sm:text-sm ${isPositive || isNegative ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-xs sm:text-sm font-bold ${isNegative ? "text-red-400" : isPositive ? "text-emerald-400" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function SortButton({ field, label, sortField, sortDir, onSort }: { field: SortField; label: string; sortField: SortField; sortDir: SortDir; onSort: (f: SortField) => void }) {
  const active = sortField === field;
  return (
    <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      {active ? (
        sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const uid = user?.uid || "";
  const profitUrl = uid ? `/api/profit?timeframe=${timeframe}&uid=${uid}` : null;
  const { data: profitData, isLoading, mutate: refetch } = useAPI<ProfitResponse>(profitUrl);

  useEffect(() => {
    if (profitData) setFetchedAt(new Date());
  }, [profitData]);

  const updatedAtLabel = fetchedAt
    ? `Updated ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(fetchedAt)}`
    : null;

  const summary = profitData?.summary || null;
  const dailyBreakdown = profitData?.dailyBreakdown || [];
  const topProducts = profitData?.topProducts || [];
  const costBreakdown = profitData?.costBreakdown || [];
  const campaignProfits = profitData?.campaignProfits || [];

  const sparkRevenue = useMemo(() => dailyBreakdown.map((d) => d.revenue), [dailyBreakdown]);
  const sparkProfit = useMemo(() => dailyBreakdown.map((d) => d.profit), [dailyBreakdown]);
  const sparkOrders = useMemo(() => dailyBreakdown.map((d) => d.orders), [dailyBreakdown]);
  const sparkMargin = useMemo(() => dailyBreakdown.map((d) => d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0), [dailyBreakdown]);

  const revenueTrend = useMemo(() => calcTrend(sparkRevenue), [sparkRevenue]);
  const profitTrend = useMemo(() => calcTrend(sparkProfit), [sparkProfit]);
  const ordersTrend = useMemo(() => calcTrend(sparkOrders), [sparkOrders]);
  const marginTrend = useMemo(() => calcTrend(sparkMargin), [sparkMargin]);

  const platformData = useMemo(() => {
    if (!campaignProfits.length) return [];
    const platformColors = ["#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#ec4899", "#6b7280"];
    const filtered = campaignProfits.filter((c) => c.revenue > 0);
    const totalRev = filtered.reduce((s, c) => s + c.revenue, 0);
    return filtered.map((c, i) => ({
      name: c.campaignName,
      revenue: c.revenue,
      orders: c.orders,
      share: totalRev > 0 ? Math.round((c.revenue / totalRev) * 100) : 0,
      color: platformColors[i % platformColors.length],
    }));
  }, [campaignProfits]);

  const pnlData = useMemo(() => {
    if (!summary) return null;
    const totalCosts = summary.totalCosts || 0;
    const totalRevenue = summary.totalRevenue || 0;
    const netProfit = summary.totalProfit || 0;
    const avgOrderValue = summary.totalOrders > 0 ? totalRevenue / summary.totalOrders : 0;
    const avgOrderProfit = summary.totalOrders > 0 ? netProfit / summary.totalOrders : 0;
    return { totalRevenue, totalCosts, netProfit, avgOrderValue, avgOrderProfit, profitMargin: summary.avgMargin, refundRate: summary.refundRate };
  }, [summary]);

  const maxProductRevenue = useMemo(() => {
    if (topProducts.length === 0) return 0;
    return Math.max(...topProducts.map((p) => p.totalRevenue));
  }, [topProducts]);

  const sortedDaily = useMemo(() => {
    const copy = [...dailyBreakdown];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date": cmp = a.date.localeCompare(b.date); break;
        case "revenue": cmp = a.revenue - b.revenue; break;
        case "profit": cmp = a.profit - b.profit; break;
        case "costs": cmp = a.costs - b.costs; break;
        case "orders": cmp = a.orders - b.orders; break;
        case "margin": {
          const mA = a.revenue > 0 ? a.profit / a.revenue : 0;
          const mB = b.revenue > 0 ? b.profit / b.revenue : 0;
          cmp = mA - mB;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [dailyBreakdown, sortField, sortDir]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }, [sortField]);

  const handleExport = useCallback(() => {
    if (dailyBreakdown.length === 0 && topProducts.length === 0) return;
    const rows: string[] = ["Date,Revenue,Profit,Orders,Costs,Margin"];
    for (const d of dailyBreakdown) {
      const margin = d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : "0.0";
      rows.push(`${d.date},${d.revenue.toFixed(2)},${d.profit.toFixed(2)},${d.orders},${d.costs.toFixed(2)},${margin}%`);
    }
    rows.push("");
    rows.push("Product,Revenue,Profit,Orders,Margin,Status");
    for (const p of topProducts) {
      rows.push(`"${p.productTitle}",${p.totalRevenue.toFixed(2)},${p.totalProfit.toFixed(2)},${p.totalOrders},${p.profitMargin}%,${p.status}`);
    }
    if (campaignProfits.length > 0) {
      rows.push("");
      rows.push("Campaign,Revenue,Profit,Orders,Ad Spend,ROAS");
      for (const c of campaignProfits) {
        rows.push(`"${c.campaignName}",${c.revenue.toFixed(2)},${c.profit.toFixed(2)},${c.orders},${c.adSpend.toFixed(2)},${c.roas}`);
      }
    }
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${timeframe}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dailyBreakdown, topProducts, campaignProfits, timeframe]);

  const hasData = summary && (summary.totalRevenue > 0 || summary.totalOrders > 0);

  const timeframeLabel = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", all: "All time" }[timeframe];

  return (
    <PageErrorBoundary>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-accent" />
                Financial Reports
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Revenue, profit, cost analysis, and P&amp;L breakdowns across all your stores and platforms.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
              {(["7d", "30d", "90d", "all"] as const).map((tf) => (
                <button key={tf} onClick={() => setTimeframe(tf)}
                  className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all ${timeframe === tf ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}>
                  {tf === "all" ? "All" : tf}
                </button>
              ))}
            </div>
            <button onClick={handleExport}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border border-border text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all">
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: "overview" as const, label: "Overview", icon: BarChart3 },
            { id: "pnl" as const, label: "P&L", icon: FileText },
            { id: "products" as const, label: "Products", icon: Package },
            { id: "platforms" as const, label: "Platforms", icon: PieChart },
            { id: "trends" as const, label: "Trends", icon: Activity },
            { id: "insights" as const, label: "Insights", icon: Zap },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-accent text-white shadow-[0_0_15px_rgba(var(--glow-color),0.3)]" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Period badge */}
        {hasData && (
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Showing data for: <span className="text-foreground font-medium">{timeframeLabel}</span></span>
            {!isLoading && updatedAtLabel && (
              <span className="ml-auto text-[10px] text-muted-foreground/60">{updatedAtLabel}</span>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {[0, 1, 2, 3].map((i) => <KPICardSkeleton key={i} />)}
            </div>
            <ChartSkeleton height={280} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <ChartSkeleton height={200} />
              <ChartSkeleton height={200} />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !hasData && (
          <div className="glass rounded-2xl p-8 sm:p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                <BarChart3 className="h-7 w-7 text-accent" />
              </div>
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">No financial data yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
              Start adding profit entries to see your financial reports. Your revenue, costs, and profit analytics will appear here automatically.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/profit-tracker" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all">
                <DollarSign className="h-4 w-4" /> Add Profit Entry
              </Link>
              <button onClick={() => refetch()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all">
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          </div>
        )}

        {/* ─── Overview Tab ─────────────────────────────────────────── */}
        {!isLoading && hasData && activeTab === "overview" && (
          <div className="space-y-6 animate-slide-up">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <KPICard label="Total Revenue" value={summary!.totalRevenue} prefix="$" change={revenueTrend.change} up={revenueTrend.up} icon={DollarSign} color="text-emerald-400" sparkline={sparkRevenue.length ? sparkRevenue : [0]} delay={0} />
              <KPICard label="Net Profit" value={summary!.totalProfit} prefix="$" change={profitTrend.change} up={profitTrend.up} icon={TrendingUp} color="text-purple-400" sparkline={sparkProfit.length ? sparkProfit : [0]} delay={100} />
              <KPICard label="Total Orders" value={summary!.totalOrders} change={ordersTrend.change} up={ordersTrend.up} icon={ShoppingCart} color="text-amber-400" sparkline={sparkOrders.length ? sparkOrders : [0]} delay={200} />
              <KPICard label="Avg Margin" value={summary!.avgMargin} suffix="%" change={marginTrend.change} up={marginTrend.up} icon={Target} color="text-blue-400" sparkline={sparkMargin.length ? sparkMargin : [0]} delay={300} />
            </div>

            {/* Revenue & Profit Chart */}
            {dailyBreakdown.length > 0 && <RevenueProfitChart data={dailyBreakdown} />}

            {/* Cost Donut + Platform Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="glass rounded-2xl p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Cost Breakdown</h3>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Where your money is going</p>
                </div>
                {costBreakdown.length > 0 ? (
                  <CostDonut data={costBreakdown} />
                ) : (
                  <div className="py-8 text-center"><p className="text-sm text-muted-foreground">No cost data available yet.</p></div>
                )}
              </div>
              <div className="glass rounded-2xl p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Revenue by Campaign</h3>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Performance by traffic source</p>
                </div>
                {platformData.length > 0 ? (
                  <PlatformDonut platforms={platformData} totalRevenue={summary!.totalRevenue} />
                ) : (
                  <div className="py-8 text-center"><p className="text-sm text-muted-foreground">No campaign data available yet.</p></div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {[
                { label: "Avg Order Value", value: formatCurrency(summary!.totalOrders > 0 ? summary!.totalRevenue / summary!.totalOrders : 0), color: "text-foreground" },
                { label: "Avg Order Profit", value: formatCurrency(summary!.totalOrders > 0 ? summary!.totalProfit / summary!.totalOrders : 0), color: "text-emerald-400" },
                { label: "Refund Rate", value: `${summary!.refundRate}%`, color: "text-amber-400" },
                { label: "Total Costs", value: formatCurrency(summary!.totalCosts ?? 0), color: "text-red-400" },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-3 sm:p-4 text-center hover:bg-surface-hover transition-all">
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-1">{stat.label}</p>
                  <p className={`font-display text-lg sm:text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── P&L Statement Tab ───────────────────────────────────── */}
        {!isLoading && hasData && activeTab === "pnl" && pnlData && (
          <div className="space-y-6 animate-slide-up">
            <div className="glass rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Profit & Loss Statement</h3>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Comprehensive financial summary for {timeframeLabel}</p>
                </div>
                <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] sm:text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all">
                  <Download className="h-3 w-3" /> Export
                </button>
              </div>

              {/* Visual P&L bar */}
              {pnlData.totalRevenue > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-surface/50 border border-border/50">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                    <span>Revenue: {formatCurrency(pnlData.totalRevenue)}</span>
                    <span>Costs: {formatCurrency(pnlData.totalCosts)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-surface overflow-hidden flex">
                    <div className="h-full bg-emerald-400/60 rounded-l-full transition-all duration-700"
                      style={{ width: `${pnlData.totalRevenue > 0 ? Math.max((pnlData.netProfit / pnlData.totalRevenue) * 100, 2) : 0}%` }} />
                    <div className="h-full bg-red-400/40 transition-all duration-700"
                      style={{ width: `${pnlData.totalRevenue > 0 ? (pnlData.totalCosts / pnlData.totalRevenue) * 100 : 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px]">
                    <span className="text-emerald-400 font-semibold">Profit: {pnlData.profitMargin.toFixed(1)}%</span>
                    <span className="text-red-400 font-semibold">Cost Ratio: {pnlData.totalRevenue > 0 ? ((pnlData.totalCosts / pnlData.totalRevenue) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/10 mb-2">
                  <p className="text-[10px] text-accent font-semibold uppercase tracking-wider">Revenue</p>
                </div>
                <PnLRow label="Gross Revenue" value={`$${pnlData.totalRevenue.toFixed(2)}`} isPositive />
                <PnLRow label="Total Costs" value={`-$${pnlData.totalCosts.toFixed(2)}`} isNegative indent />
                <div className="border-t border-white/5 my-2" />
                <PnLRow label="Net Profit" value={`$${pnlData.netProfit.toFixed(2)}`} isPositive={pnlData.netProfit >= 0} isNegative={pnlData.netProfit < 0} />
                <div className="border-t border-white/5 my-2" />
                <PnLRow label="Profit Margin" value={`${pnlData.profitMargin.toFixed(1)}%`} />
                <PnLRow label="Average Order Value" value={`$${pnlData.avgOrderValue.toFixed(2)}`} />
                <PnLRow label="Average Order Profit" value={`$${pnlData.avgOrderProfit.toFixed(2)}`} />
                <PnLRow label="Refund Rate" value={`${pnlData.refundRate}%`} />
                <PnLRow label="Total Orders" value={String(summary!.totalOrders)} />
              </div>
              {/* Cost breakdown detail */}
              {costBreakdown.length > 0 && (
                <div className="mt-6">
                  <div className="p-3 rounded-lg bg-surface/50 mb-2">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Cost Detail</p>
                  </div>
                  <div className="space-y-1">
                    {costBreakdown.map((c) => (
                      <PnLRow key={c.name} label={c.name} value={`$${c.value.toFixed(2)}`} indent />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Products Tab ────────────────────────────────────────── */}
        {!isLoading && hasData && activeTab === "products" && (
          <div className="space-y-6 animate-slide-up">
            <div className="glass rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Product Profitability</h3>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Which products are actually profitable after all costs</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Profitable</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Breakeven</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Losing</span>
                </div>
              </div>
              {topProducts.length > 0 ? (
                <div className="space-y-1">
                  {topProducts.map((p, i) => (
                    <ProductRow key={p.productTitle} product={p} rank={i + 1} delay={i * 50} maxRevenue={maxProductRevenue} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No product data available yet.</p>
                </div>
              )}
            </div>

            {/* Campaign Attribution */}
            {campaignProfits.length > 0 && (
              <div className="glass rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Campaign Attribution</h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Profit by ad campaign or traffic source</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {campaignProfits.map((c, i) => (
                    <CampaignRow key={c.campaignName} campaign={c} delay={i * 50} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Platforms Tab ────────────────────────────────────────── */}
        {!isLoading && hasData && activeTab === "platforms" && (
          <div className="space-y-6 animate-slide-up">
            <div className="glass rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Revenue by Campaign/Platform</h3>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">How your revenue is distributed across sources</p>
                </div>
              </div>
              {platformData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <PlatformDonut platforms={platformData} totalRevenue={summary!.totalRevenue} />
                  <div className="space-y-3">
                    {platformData.map((p) => (
                      <div key={p.name} className="p-3 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-xs font-medium text-foreground">{p.name}</span>
                          </div>
                          <span className="text-xs font-bold text-foreground">${p.revenue.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface overflow-hidden mb-1.5">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.share}%`, backgroundColor: p.color }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{p.orders} orders</span>
                          <span>{p.share}% of total</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <PieChart className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No platform data available yet.</p>
                </div>
              )}
            </div>

            {/* Campaign Performance List */}
            {campaignProfits.length > 0 && (
              <div className="glass rounded-2xl p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Campaign Performance</h3>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Ranked by profit contribution</p>
                </div>
                <div className="space-y-2">
                  {campaignProfits.slice(0, 8).map((s, i) => (
                    <div key={s.campaignName} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-hover transition-all">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}</span>
                        <div>
                          <p className="text-xs font-medium text-foreground">{s.campaignName}</p>
                          <p className="text-[10px] text-muted-foreground">{s.orders} orders</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-foreground">${s.revenue.toFixed(2)}</p>
                        <p className={`text-[10px] ${s.profit >= 0 ? "text-accent" : "text-red-400"}`}>${s.profit.toFixed(2)} profit</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Trends Tab ──────────────────────────────────────────── */}
        {!isLoading && hasData && activeTab === "trends" && (
          <div className="space-y-6 animate-slide-up">
            {dailyBreakdown.length > 0 && <RevenueProfitChart data={dailyBreakdown} />}

            {/* Daily data table */}
            {dailyBreakdown.length > 0 && (
              <div className="glass rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Daily Breakdown</h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Detailed day-by-day financial performance</p>
                  </div>
                  <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] sm:text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all">
                    <Download className="h-3 w-3" /> Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        {([
                          ["date", "Date"],
                          ["revenue", "Revenue"],
                          ["profit", "Profit"],
                          ["costs", "Costs"],
                          ["orders", "Orders"],
                          ["margin", "Margin"],
                        ] as [SortField, string][]).map(([field, label]) => (
                          <th key={field} className={`py-2 px-3 text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase ${field === "date" ? "text-left" : "text-right"}`}>
                            <SortButton field={field} label={label} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDaily.map((d) => {
                        const margin = d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={d.date} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                            <td className="py-2 px-3 text-xs text-foreground font-medium">{d.date}</td>
                            <td className="py-2 px-3 text-xs text-emerald-400 font-bold text-right">${d.revenue.toFixed(2)}</td>
                            <td className={`py-2 px-3 text-xs font-bold text-right ${d.profit >= 0 ? "text-accent" : "text-red-400"}`}>${d.profit.toFixed(2)}</td>
                            <td className="py-2 px-3 text-xs text-red-400 text-right">${d.costs.toFixed(2)}</td>
                            <td className="py-2 px-3 text-xs text-foreground text-right">{d.orders}</td>
                            <td className={`py-2 px-3 text-xs font-bold text-right ${Number(margin) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{margin}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {dailyBreakdown.length > 30 && (
                  <p className="text-[10px] text-muted-foreground text-center mt-3">Showing {sortedDaily.length} of {dailyBreakdown.length} days</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Insights Tab ────────────────────────────────────────── */}
        {!isLoading && hasData && activeTab === "insights" && (
          <div className="space-y-6 animate-slide-up">
            <div className="glass rounded-2xl p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Growth Insights</h3>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">Rule-based recommendations from your actual metrics</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary!.avgMargin >= 30 && (
                  <InsightCard icon={TrendingUp} title="Strong Margins" description={`Your avg margin is ${summary!.avgMargin}%. This is healthy — consider scaling your top performing products.`} type="success" delay={0} />
                )}
                {summary!.avgMargin < 30 && summary!.avgMargin > 0 && (
                  <InsightCard icon={AlertTriangle} title="Low Margins" description={`Your avg margin is only ${summary!.avgMargin}%. Review your costs and consider raising prices or finding cheaper suppliers.`} type="warning" delay={0} />
                )}
                {summary!.refundRate > 5 && (
                  <InsightCard icon={AlertTriangle} title="High Refund Rate" description={`Your refund rate is ${summary!.refundRate}%. This eats into profits. Investigate product quality or listing accuracy.`} type="warning" delay={100} />
                )}
                {summary!.refundRate <= 2 && summary!.refundRate >= 0 && (
                  <InsightCard icon={TrendingUp} title="Low Refund Rate" description={`Refund rate is only ${summary!.refundRate}%. Great job keeping returns minimal.`} type="success" delay={100} />
                )}
                {topProducts.length > 0 && (
                  <InsightCard icon={Package} title="Top Product Focus" description={`"${topProducts[0].productTitle}" generated $${topProducts[0].totalRevenue.toFixed(0)} with ${topProducts[0].profitMargin}% margin. Double down on winners.`} type="info" delay={200} />
                )}
                {platformData.length > 1 && (
                  <InsightCard icon={Zap} title="Diversified Revenue" description={`Revenue spread across ${platformData.length} campaigns. Diversification reduces dependency risk.`} type="success" delay={300} />
                )}
                {platformData.length === 1 && (
                  <InsightCard icon={AlertTriangle} title="Single Source Risk" description={`All revenue from ${platformData[0]?.name}. Consider diversifying your traffic sources.`} type="warning" delay={300} />
                )}
                {summary!.totalOrders > 100 && (
                  <InsightCard icon={Target} title="Scale Opportunity" description={`With ${summary!.totalOrders} orders, you have enough data to optimize. Consider A/B testing product listings.`} type="info" delay={400} />
                )}
                {topProducts.length > 0 && topProducts.some((p) => p.status === "losing") && (
                  <InsightCard icon={AlertTriangle} title="Losing Products" description={`${topProducts.filter((p) => p.status === "losing").length} products are unprofitable. Consider discontinuing or repricing them.`} type="warning" delay={500} />
                )}
                {dailyBreakdown.length >= 7 && (() => {
                  const recent7 = dailyBreakdown.slice(-7);
                  const prev7 = dailyBreakdown.slice(-14, -7);
                  if (prev7.length === 0) return null;
                  const recentAvg = recent7.reduce((s, d) => s + d.revenue, 0) / 7;
                  const prevAvg = prev7.reduce((s, d) => s + d.revenue, 0) / 7;
                  const weekOverWeek = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0;
                  if (weekOverWeek > 10) {
                    return <InsightCard icon={TrendingUp} title="Revenue Growing" description={`Revenue is up ${weekOverWeek.toFixed(0)}% week-over-week. Keep the momentum going!`} type="success" delay={600} />;
                  }
                  if (weekOverWeek < -10) {
                    return <InsightCard icon={AlertTriangle} title="Revenue Declining" description={`Revenue dropped ${Math.abs(weekOverWeek).toFixed(0)}% week-over-week. Review your marketing strategy.`} type="warning" delay={600} />;
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Cost Optimization */}
            {costBreakdown.length > 0 && (() => {
              const significantCosts = costBreakdown.filter((c) => c.pct > 10).sort((a, b) => b.pct - a.pct).slice(0, 3);
              if (significantCosts.length === 0) return null;
              const tips: Record<string, string> = {
                "COGS": "Negotiate bulk discounts with suppliers or explore alternative sourcing.",
                "Shipping": "Compare shipping carriers and consider bulk shipping options.",
                "Platform Fees": "Evaluate platform commission structures and optimize pricing.",
                "Payment Processing": "Negotiate processing rates or explore alternative payment providers.",
                "Refunds": "Improve product quality and listing accuracy to reduce returns.",
                "Ad Spend": "Optimize ad targeting and focus on high-ROAS campaigns.",
                "Other": "Review miscellaneous expenses for potential savings.",
              };
              const potentialSavings = significantCosts.reduce((s, c) => s + c.value * 0.1, 0);
              return (
                <div className="glass rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Cost Optimization Tips</h3>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground">Reduce your largest cost categories by 10% to save ~{formatCurrency(potentialSavings)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {significantCosts.map((c) => (
                      <div key={c.name} className="flex items-start gap-3 p-3 rounded-xl bg-surface/50 border border-border/50">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: c.color }} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-foreground">{c.name}</p>
                            <span className="text-[10px] font-bold text-muted-foreground">{c.pct}% — {formatCurrency(c.value)}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{tips[c.name] || "Review this cost category for potential savings."}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ─── Quick Actions ───────────────────────────────────────── */}
        {!isLoading && hasData && (
          <div className="glass rounded-2xl p-4 sm:p-5">
            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              <Link href="/profit-tracker" className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-accent/10 group-hover:scale-110 transition-transform shrink-0">
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">Profit Tracker</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Detailed per-order P&amp;L</p>
                </div>
              </Link>
              <Link href="/revenue" className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-400/10 group-hover:scale-110 transition-transform shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">Revenue Forecast</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Trends &amp; estimated projections</p>
                </div>
              </Link>
              <Link href="/calculator" className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-400/10 group-hover:scale-110 transition-transform shrink-0">
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">Calculator</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Estimate profit</p>
                </div>
              </Link>
              <Link href="/ad-roi" className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-400/10 group-hover:scale-110 transition-transform shrink-0">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-foreground truncate">Ad ROI</p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Campaign analytics</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageErrorBoundary>
  );
}
