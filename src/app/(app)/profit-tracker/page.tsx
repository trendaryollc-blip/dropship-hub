"use client";

import { useState, useEffect, useRef } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart, Download,
  Target, RefreshCw,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ProductProfitability, DailyProfit, CostBreakdownItem, CampaignProfit } from "@/types/profit";

// ─── Sub-components ──────────────────────────────────────────────

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color.replace("#", "")})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KPICard({ label, value, prefix, suffix, change, up, icon: Icon, color, sparkline, delay }: {
  label: string; value: number; prefix?: string; suffix?: string; change: string; up: boolean;
  icon: typeof DollarSign; color: string; sparkline: number[]; delay: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useAnimatedCounter(value, 1500, isInView);
  return (
    <div ref={ref} className={`glass rounded-xl p-3 sm:p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg ${color}/10 group-hover:scale-110 transition-transform`}>
          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color}`} />
        </div>
        <span className={`flex items-center gap-0.5 text-[10px] sm:text-[11px] font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
          {change}
        </span>
      </div>
      <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{prefix || ""}{count.toLocaleString()}{suffix || ""}</p>
      <div className="flex items-center justify-between mt-1.5 sm:mt-2">
        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate pr-2">{label}</p>
        <MiniSparkline points={sparkline} color={color === "text-emerald-400" ? "#22c55e" : color === "text-purple-400" ? "#a855f7" : color === "text-amber-400" ? "#f59e0b" : "#3b82f6"} />
      </div>
    </div>
  );
}

function ProfitChart({ data }: { data: DailyProfit[] }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; value: number; profit: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.length === 0) {
    return (
      <div ref={ref} className="glass rounded-2xl p-3 sm:p-5">
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Profit Trend</h3>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-2">No profit data available yet.</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.revenue), 0);
  const minVal = Math.min(...data.map((d) => d.profit), 0);
  const range = maxVal - minVal || 1;
  const padding = { top: 20, right: 15, bottom: 30, left: 40 };
  const w = 800;
  const h = 260;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const getX = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - ((val - minVal) / range) * chartH;

  const revenuePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.revenue)}`).join(" ");
  const profitPath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.profit)}`).join(" ");
  const revenueArea = `${revenuePath} L ${getX(data.length - 1)} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(minVal + range * p));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round(((x - padding.left) / chartW) * (data.length - 1));
    if (idx >= 0 && idx < data.length) {
      setTooltip({ x: getX(idx), y: getY(data[idx].revenue), date: data[idx].date, value: data[idx].revenue, profit: data[idx].profit });
    }
  };

  return (
    <div ref={ref} className={`glass rounded-2xl p-3 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Profit Trend</h3>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground">Revenue vs Profit over time</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-blue-500" /><span className="text-muted-foreground">Revenue</span></span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-emerald-400" /><span className="text-muted-foreground">Profit</span></span>
        </div>
      </div>
      <div className="relative">
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
          <defs>
            <linearGradient id="profitChartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={padding.left} y1={getY(tick)} x2={w - padding.right} y2={getY(tick)} stroke="rgba(255,255,255,0.04)" />
              <text x={padding.left - 6} y={getY(tick) + 3} textAnchor="end" className="fill-muted-foreground text-[8px] sm:text-[9px]">${tick}</text>
            </g>
          ))}
          {isInView && <path d={revenueArea} fill="url(#profitChartGrad)" className="animate-fade-in" />}
          {isInView && <path d={revenuePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" className="animate-chart-draw" />}
          {isInView && <path d={profitPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" className="animate-chart-draw" style={{ animationDelay: "0.5s" }} />}
          {data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map((d, i) => (
            <circle key={i} cx={getX(data.indexOf(d))} cy={getY(d.revenue)} r="3" fill="#3b82f6" stroke="#0f0f17" strokeWidth="2" />
          ))}
          {tooltip && (
            <g>
              <line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={padding.top + chartH} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <circle cx={tooltip.x} cy={tooltip.y} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
              <rect x={tooltip.x - 50} y={tooltip.y - 34} width="100" height="24" rx="6" fill="#16161f" stroke="rgba(255,255,255,0.1)" />
              <text x={tooltip.x} y={tooltip.y - 18} textAnchor="middle" className="fill-foreground text-[9px] font-bold">Rev: ${tooltip.value} | P: ${tooltip.profit}</text>
            </g>
          )}
          {data.filter((_, i) => i % 7 === 0 || i === data.length - 1).map((d, i) => (
            <text key={i} x={getX(data.indexOf(d))} y={h - 8} textAnchor="middle" className="fill-muted-foreground text-[7px] sm:text-[8px]">{d.date.slice(5)}</text>
          ))}
        </svg>
      </div>
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

  const segments = data.reduce<Array<typeof data[0] & { offset: number; dash: number }>>((acc, d) => {
    const prevOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    const dash = (d.value / total) * circumference;
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
          <span className="font-display text-lg font-bold text-foreground">${total.toFixed(0)}</span>
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

function ProductRow({ product, rank, delay }: { product: ProductProfitability; rank: number; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const statusColors = { profitable: "text-emerald-400 bg-emerald-400/10", breakeven: "text-amber-400 bg-amber-400/10", losing: "text-red-400 bg-red-400/10" };
  return (
    <div ref={ref} className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-surface-hover transition-all ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground w-4">{rank}</span>
      <span className="text-base sm:text-xl">{product.productImage}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{product.productTitle}</p>
        <div className="flex items-center gap-2">
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">{product.totalOrders} orders</span>
          <span className={`text-[9px] sm:text-[10px] font-semibold ${product.trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>{product.trend >= 0 ? "+" : ""}{product.trend}%</span>
        </div>
      </div>
      <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold ${statusColors[product.status]}`}>{product.status}</span>
      <div className="text-right shrink-0">
        <p className={`text-xs sm:text-sm font-bold ${product.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>${product.totalProfit.toFixed(2)}</p>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground">{product.profitMargin}% margin</p>
      </div>
    </div>
  );
}

function CampaignRow({ campaign, delay }: { campaign: CampaignProfit; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  return (
    <div ref={ref} className={`flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover transition-all ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{campaign.campaignName}</p>
        <div className="flex items-center gap-2">
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">${campaign.adSpend.toFixed(2)} spend</span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">{campaign.orders} orders</span>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-xs sm:text-sm font-bold ${campaign.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>${campaign.profit.toFixed(2)}</p>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground">{campaign.roas}x ROAS</p>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function ProfitTrackerPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [platform, setPlatform] = useState("all");
  const [loading, setLoading] = useState(true);
  const [topProducts, setTopProducts] = useState<ProductProfitability[]>([]);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyProfit[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>([]);
  const [campaignProfits, setCampaignProfits] = useState<CampaignProfit[]>([]);
  const [summary, setSummary] = useState<{
    totalRevenue: number; totalProfit: number; profitMargin: number; totalOrders: number;
    avgOrderProfit: number; avgOrderValue: number; refundRate: number; totalCosts: number;
  } | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ timeframe, platform, uid: user.uid });
      const res = await fetch(`/api/profit?${params}`);
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setTopProducts(data.topProducts || []);
        setDailyBreakdown(data.dailyBreakdown || []);
        setCostBreakdown(data.costBreakdown || []);
        setCampaignProfits(data.campaignProfits || []);
      }
    } catch {}
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- async data fetch on mount
  useEffect(() => { void fetchData(); }, [timeframe, platform]);

  const sparkRevenue = dailyBreakdown.map((d) => d.revenue);
  const sparkProfit = dailyBreakdown.map((d) => d.profit);
  const sparkOrders = dailyBreakdown.map((d) => d.orders);
  const sparkMargin = dailyBreakdown.map((d) => d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1">Profit Tracker</h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">Real-time profit tracking with full cost breakdown per order, product, and campaign.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
            {(["7d", "30d", "90d", "all"] as const).map((tf) => (
              <button key={tf} onClick={() => setTimeframe(tf)} className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all ${timeframe === tf ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}>
                {tf === "all" ? "All" : tf}
              </button>
            ))}
          </div>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="px-2 sm:px-3 py-1.5 rounded-xl border border-border bg-surface text-[10px] sm:text-[11px] text-muted-foreground">
            <option value="all">All Platforms</option>
            <option value="Amazon">Amazon</option>
            <option value="Shopify">Shopify</option>
            <option value="eBay">eBay</option>
            <option value="Etsy">Etsy</option>
          </select>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading profit data...</p>
        </div>
      ) : summary ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <KPICard label="Total Revenue" value={summary.totalRevenue} prefix="$" change="+18%" up icon={DollarSign} color="text-emerald-400" sparkline={sparkRevenue.length ? sparkRevenue : [0]} delay={0} />
            <KPICard label="Net Profit" value={summary.totalProfit} prefix="$" change="+12%" up icon={TrendingUp} color="text-purple-400" sparkline={sparkProfit.length ? sparkProfit : [0]} delay={100} />
            <KPICard label="Total Orders" value={summary.totalOrders} change="+24%" up icon={ShoppingCart} color="text-amber-400" sparkline={sparkOrders.length ? sparkOrders : [0]} delay={200} />
            <KPICard label="Avg Margin" value={summary.profitMargin} suffix="%" change="+2.1%" up icon={Target} color="text-blue-400" sparkline={sparkMargin.length ? sparkMargin : [0]} delay={300} />
          </div>

          {/* Profit Trend Chart */}
          <ProfitChart data={dailyBreakdown} />

          {/* Cost Breakdown + Campaign Attribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="glass rounded-2xl p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Cost Breakdown</h3>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">Where your money is going</p>
              </div>
              <CostDonut data={costBreakdown} />
            </div>
            <div className="glass rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Campaign Profit</h3>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground">Profit by ad campaign</p>
                </div>
              </div>
              <div className="space-y-1">
                {campaignProfits.map((c, i) => (
                  <CampaignRow key={c.campaignName} campaign={c} delay={i * 50} />
                ))}
              </div>
            </div>
          </div>

          {/* Product Profitability */}
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
            <div className="space-y-1">
              {topProducts.map((p, i) => (
                <ProductRow key={p.productTitle} product={p} rank={i + 1} delay={i * 50} />
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <div className="glass rounded-xl p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-1">Avg Order Value</p>
              <p className="font-display text-lg sm:text-xl font-bold text-foreground">${(summary.avgOrderValue ?? 0).toFixed(2)}</p>
            </div>
            <div className="glass rounded-xl p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-1">Avg Order Profit</p>
              <p className="font-display text-lg sm:text-xl font-bold text-emerald-400">${(summary.avgOrderProfit ?? 0).toFixed(2)}</p>
            </div>
            <div className="glass rounded-xl p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-1">Refund Rate</p>
              <p className="font-display text-lg sm:text-xl font-bold text-amber-400">{summary.refundRate}%</p>
            </div>
            <div className="glass rounded-xl p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-1">Total Costs</p>
              <p className="font-display text-lg sm:text-xl font-bold text-red-400">${(summary.totalCosts ?? 0).toFixed(2)}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="glass rounded-2xl p-8 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No profit data available</h3>
          <p className="text-sm text-muted-foreground mb-4">Connect your store to start tracking real-time profits</p>
          <button onClick={fetchData} className="text-sm text-accent hover:text-accent/80 flex items-center gap-2 mx-auto"><RefreshCw className="h-4 w-4" /> Retry</button>
        </div>
      )}
    </div>
  );
}
