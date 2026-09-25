"use client";

import Image from "next/image";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Minus, Flame, Target, BarChart3,
  Shield, Zap, ArrowRight, ShoppingCart, Users, Globe,
  Clock, DollarSign, RotateCcw, Package, Star, MapPin,
  Calendar, AlertTriangle, Eye, BookmarkPlus, Sparkles,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { NicheData } from "@/types/niches";

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

function TrendChart({ data, color = "#3b82f6", height = 80, gradientId = "trendGrad" }: { data: number[]; color?: string; height?: number; gradientId?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 300;
  const points = data.map((p, i) => `${(i / (data.length - 1)) * w},${height - ((p - min) / range) * (height - 8) - 4}`);
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p}`).join(" ");
  const areaD = `${pathD} L ${w} ${height} L 0 ${height} Z`;
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradientId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className="animate-chart-draw" />
        {data.map((p, i) => {
          const x = (i / (data.length - 1)) * w;
          const y = height - ((p - min) / range) * (height - 8) - 4;
          return <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="var(--background)" strokeWidth="1.5" />;
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((_, i) => {
          if (data.length <= 6 || i % 2 === 0) {
            return <span key={i} className="text-[8px] text-muted-foreground">{labels[i % 12]}</span>;
          }
          return <span key={i} className="text-[8px] text-muted-foreground" />;
        })}
      </div>
    </div>
  );
}

const badgeColors: Record<string, string> = {
  gold: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  silver: "text-slate-300 bg-slate-300/10 border-slate-300/20",
  bronze: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

interface NicheDetailProps {
  niche: NicheData;
  onMission?: (id: string) => void;
  onWatchlist?: (id: string) => void;
  onListing?: (id: string) => void;
}

export default function NicheDetail({ niche, onMission, onWatchlist, onListing }: NicheDetailProps) {
  const { ref: heroRef, isInView: heroVisible } = useInView({ threshold: 0.1 });
  const { ref: scoresRef, isInView: scoresVisible } = useInView({ threshold: 0.1 });
  const { ref: productsRef, isInView: productsVisible } = useInView({ threshold: 0.1 });
  const { ref: suppliersRef, isInView: suppliersVisible } = useInView({ threshold: 0.1 });
  const { ref: competitionRef, isInView: competitionVisible } = useInView({ threshold: 0.1 });
  const { ref: geoRef, isInView: geoVisible } = useInView({ threshold: 0.1 });
  const { ref: seasonalRef, isInView: seasonalVisible } = useInView({ threshold: 0.1 });

  const heatColor = niche.heat >= 80 ? "#ef4444" : niche.heat >= 60 ? "#f59e0b" : "#3b82f6";
  const trendColor = niche.trend === "up" ? "text-emerald-400" : niche.trend === "down" ? "text-red-400" : "text-muted-foreground";
  const maxDemand = Math.max(...(niche.geographicDemand || []).map((g) => g.demand), 1);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div ref={heroRef} className={`glass rounded-2xl border border-border p-6 transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-border shrink-0">
            <Image src={niche.image || "/placeholder.png"} alt={niche.name} width={64} height={64} unoptimized className="w-full h-full object-cover" />
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
                <div className="relative w-12 h-12">
                  <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke={niche.overallScore >= 75 ? "#22c55e" : niche.overallScore >= 50 ? "#3b82f6" : "#f59e0b"} strokeWidth="3" strokeDasharray={125.6} strokeDashoffset={125.6 - (niche.overallScore / 100) * 125.6} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-foreground">{niche.overallScore}</span>
                  </div>
                </div>
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
                <span className="text-sm font-bold">
                  {niche.growth != null ? `${niche.growth > 0 ? "+" : ""}${niche.growth}% growth` : "Growth not tracked"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/50">
          <button onClick={() => onMission?.(niche.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all">
            <Target className="h-3.5 w-3.5" /> Start Mission
          </button>
          <button onClick={() => onWatchlist?.(niche.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-400/20 transition-all">
            <BookmarkPlus className="h-3.5 w-3.5" /> Add to Watchlist
          </button>
          <button onClick={() => onListing?.(niche.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-400/10 border border-purple-400/20 text-purple-400 text-xs font-semibold hover:bg-purple-400/20 transition-all">
            <Sparkles className="h-3.5 w-3.5" /> Generate Listing
          </button>
          <Link href={`/products?q=${encodeURIComponent(niche.name)}`} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-muted-foreground text-xs font-semibold hover:text-foreground hover:border-accent/20 transition-all">
            <Eye className="h-3.5 w-3.5" /> View Details
          </Link>
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
                { icon: ShoppingCart, label: "Products", value: (niche.productCount || 0).toLocaleString(), color: "text-blue-400" },
                { icon: TrendingUp, label: "Avg Margin", value: niche.avgMargin != null ? `${niche.avgMargin}%` : "n/a", color: "text-emerald-400" },
                { icon: Users, label: "Saturation", value: `${niche.saturation || 0}% est.`, color: (niche.saturation || 0) > 60 ? "text-red-400" : "text-emerald-400" },
                { icon: DollarSign, label: "Profit/Unit", value: niche.profitPerUnit != null ? `$${niche.profitPerUnit.toFixed(2)}` : "n/a", color: "text-accent" },
                { icon: Clock, label: "Avg Shipping", value: niche.avgShippingDays != null ? `${niche.avgShippingDays} days` : "n/a", color: "text-blue-400" },
                { icon: RotateCcw, label: "Return Rate", value: niche.avgReturnRate != null ? `${niche.avgReturnRate}%` : "n/a", color: (niche.avgReturnRate || 0) > 5 ? "text-red-400" : "text-emerald-400" },
                { icon: Target, label: "Monthly Rev", value: niche.estimatedMonthlyRevenue != null ? `$${niche.estimatedMonthlyRevenue.toLocaleString()}` : "n/a", color: "text-accent" },
                { icon: Globe, label: "Platforms", value: (niche.bestPlatforms || []).join(", "), color: "text-accent" },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-xl bg-surface/50 border border-border/50">
                  <stat.icon className={`h-4 w-4 ${stat.color} mb-1`} />
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  <p className="text-xs font-bold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-[10px] text-muted-foreground">Sub-scores (demand, profit, competition, trend, seasonality) are heuristics from catalog product counts and average prices — not market measurement.</p>
      </div>

      {/* Trend History Chart */}
      <div className={`glass rounded-2xl border border-border p-6 transition-all duration-700 ${productsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} ref={productsRef}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h3 className="font-display text-sm font-semibold text-foreground">12-Month Trend History</h3>
        </div>
        {(niche.weeklyData || []).length >= 2 ? (
          <TrendChart data={niche.weeklyData || []} color={heatColor} />
        ) : (
          <p className="text-xs text-muted-foreground">Trend history not available — needs a historical demand API not connected yet.</p>
        )}
      </div>

      {/* Top Products Breakdown */}
      <div className={`glass rounded-2xl border border-border p-6 transition-all duration-700 ${productsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-4 w-4 text-amber-400" />
          <h3 className="font-display text-sm font-semibold text-foreground">Top Products in Niche</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-muted-foreground">{(niche.topProducts || []).length} products</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/50">
                <th className="pb-2 text-[10px] text-muted-foreground font-medium">Product</th>
                <th className="pb-2 text-[10px] text-muted-foreground font-medium text-right">Price</th>
                <th className="pb-2 text-[10px] text-muted-foreground font-medium text-right">Cost</th>
                <th className="pb-2 text-[10px] text-muted-foreground font-medium text-right">Margin</th>
                <th className="pb-2 text-[10px] text-muted-foreground font-medium text-right">Orders</th>
                <th className="pb-2 text-[10px] text-muted-foreground font-medium text-right">Rating</th>
                <th className="pb-2 text-[10px] text-muted-foreground font-medium text-right">Ship Days</th>
                <th className="pb-2 text-[10px] text-muted-foreground font-medium text-right">Returns</th>
              </tr>
            </thead>
            <tbody>
              {(niche.topProducts || []).slice(0, 5).map((product) => (
                <tr key={product.id} className="border-b border-border/30 hover:bg-surface/30 transition-colors">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      {product.image && (
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-border shrink-0">
                          <Image src={product.image} alt={product.name} width={32} height={32} unoptimized className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-[11px] text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-[11px] text-foreground font-bold text-right">${product.sellPrice.toFixed(2)}</td>
                  <td className="py-2.5 text-[11px] text-muted-foreground text-right">${product.costPrice.toFixed(2)}</td>
                  <td className="py-2.5 text-[11px] font-bold text-right">
                    <span className={product.margin >= 40 ? "text-emerald-400" : product.margin >= 25 ? "text-amber-400" : "text-red-400"}>{product.margin}%</span>
                  </td>
                  <td className="py-2.5 text-[11px] text-muted-foreground text-right">{product.orders ?? "—"}</td>
                  <td className="py-2.5 text-[11px] text-right">
                    {product.rating != null ? (
                      <div className="flex items-center justify-end gap-0.5">
                        <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                        <span className="text-foreground">{product.rating}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-[11px] text-muted-foreground text-right">{product.shippingDays != null ? `${product.shippingDays}d` : "—"}</td>
                  <td className="py-2.5 text-[11px] text-right">
                    {product.returnRate != null ? (
                      <span className={product.returnRate > 5 ? "text-red-400" : "text-emerald-400"}>{product.returnRate}%</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <p className="text-lg font-bold text-accent">{niche.topProductPrice != null ? `$${niche.topProductPrice.toFixed(2)}` : "n/a"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Margin</p>
                <p className="text-lg font-bold text-emerald-400">{niche.topProductMargin != null ? `${niche.topProductMargin}%` : "n/a"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Profit/Unit</p>
                <p className="text-lg font-bold text-emerald-400">{niche.profitPerUnit != null ? `$${niche.profitPerUnit.toFixed(2)}` : "n/a"}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-purple-400" />
            <h3 className="font-display text-sm font-semibold text-foreground">Seasonality</h3>
          </div>
          <p className="text-xs text-foreground/80 mb-3">{niche.seasonality || "Seasonality notes not available yet."}</p>
          <div className="flex flex-wrap gap-1.5">
            {(niche.keywords || []).map((kw) => (
              <span key={kw} className="text-[10px] px-2 py-1 rounded-lg bg-surface/50 border border-border/50 text-muted-foreground">{kw}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Competition Analysis */}
      <div ref={competitionRef} className={`glass rounded-2xl border border-border p-6 transition-all duration-700 ${competitionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="font-display text-sm font-semibold text-foreground">Competition Analysis</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-1">Stores Selling</p>
            <p className="text-lg font-bold text-foreground">{niche.competition?.storeCount != null ? niche.competition.storeCount : "—"}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-1">Avg Store Rating</p>
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <p className="text-lg font-bold text-foreground">{niche.competition?.avgStoreRating != null ? niche.competition.avgStoreRating : "—"}</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-1">Price Range (est.)</p>
            <p className="text-sm font-bold text-foreground">
              {niche.competition?.priceRange
                ? `$${niche.competition.priceRange.min} - $${niche.competition.priceRange.max}`
                : "—"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-1">Saturation</p>
            <p className={`text-lg font-bold ${(niche.competition?.saturationLevel || "low") === "low" ? "text-emerald-400" : (niche.competition?.saturationLevel || "low") === "medium" ? "text-amber-400" : "text-red-400"}`}>{niche.competition?.saturationLevel || "low"}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">Price range is estimated from the niche&apos;s average catalog price. Store count and ratings need marketplace APIs not connected yet — shown as — when unavailable.</p>
        <div className="mt-4 p-3 rounded-xl bg-surface/30 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Top Platforms</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(niche.competition?.topPlatforms || niche.bestPlatforms || []).map((platform) => (
              <span key={platform} className="text-[10px] px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent font-medium">{platform}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Geographic Demand */}
      <div ref={geoRef} className={`glass rounded-2xl border border-border p-6 transition-all duration-700 ${geoVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-blue-400" />
          <h3 className="font-display text-sm font-semibold text-foreground">Geographic Demand</h3>
        </div>
        {(niche.geographicDemand || []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Geographic demand not available — needs a regional demand API not connected yet.</p>
        ) : (
          <div className="space-y-3">
            {(niche.geographicDemand || []).map((geo) => (
              <div key={geo.country} className="flex items-center gap-3">
                <span className="text-xs text-foreground font-medium w-28 shrink-0">{geo.country}</span>
                <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-accent transition-all duration-700" style={{ width: `${(geo.demand / maxDemand) * 100}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right">{geo.demand}%</span>
                <span className="text-[10px] text-emerald-400 font-medium w-16 text-right">AOV ${geo.avgOrderValue}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seasonal Calendar */}
      <div ref={seasonalRef} className={`glass rounded-2xl border border-border p-6 transition-all duration-700 ${seasonalVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-purple-400" />
          <h3 className="font-display text-sm font-semibold text-foreground">Seasonal Demand Calendar</h3>
        </div>
        {(niche.seasonalTrend || []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Seasonal demand not available — needs historical sales data not connected yet.</p>
        ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
          {(niche.seasonalTrend || []).map((season) => {
            const maxSeasonalDemand = Math.max(...(niche.seasonalTrend || []).map((s) => s.demand), 1);
            const intensity = season.demand / maxSeasonalDemand;
            return (
              <div key={season.month} className={`text-center p-2 rounded-xl border transition-all ${season.isPeak ? "border-accent/30 bg-accent/5" : "border-border/50 bg-surface/30"}`}>
                <p className="text-[10px] text-muted-foreground mb-1">{season.month}</p>
                <div className="h-12 rounded-lg overflow-hidden bg-surface/50 relative">
                  <div className="absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-500" style={{ height: `${intensity * 100}%`, background: season.isPeak ? "linear-gradient(to top, var(--accent), var(--accent-warm))" : "linear-gradient(to top, #3b82f6, #60a5fa)" }} />
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">{season.demand}%</p>
                {season.isPeak && <p className="text-[8px] text-accent font-bold">PEAK</p>}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Suppliers */}
      <div ref={suppliersRef} className={`glass rounded-2xl border border-border p-6 transition-all duration-700 ${suppliersVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-emerald-400" />
          <h3 className="font-display text-sm font-semibold text-foreground">Top Suppliers for This Niche</h3>
        </div>
        {(niche.topSuppliers || []).length === 0 ? (
          <p className="text-xs text-muted-foreground mb-3">No supplier scores yet — connect supplier APIs or browse the supplier directory below.</p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(niche.topSuppliers || []).map((s) => (
            <Link key={s.name} href="/suppliers" className="flex flex-col p-3 rounded-xl bg-surface/50 border border-border/50 hover:border-accent/20 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border flex items-center justify-center font-display text-sm font-bold text-foreground shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${badgeColors[s.badge]}`}>{s.badge}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <p className="text-muted-foreground">Reliability</p>
                  <p className="font-bold text-foreground">{s.reliability}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Shipping</p>
                  <p className="font-bold text-foreground">{s.avgShippingDays}d</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-bold text-foreground">${s.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">MOQ</p>
                  <p className="font-bold text-foreground">{s.moq}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        )}
        <Link href={`/suppliers?category=${encodeURIComponent(niche.category || "")}`} className="w-full flex items-center justify-center gap-1.5 mt-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all">
          View All Suppliers <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Related Niches */}
      <div className="glass rounded-2xl border border-border p-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3">Related Niches</h3>
        {(niche.relatedNiches || []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Related niches not available yet.</p>
        ) : (
        <div className="flex flex-wrap gap-2">
          {(niche.relatedNiches || []).map((rn) => (
            <span key={rn} className="text-xs px-3 py-1.5 rounded-lg bg-surface/50 border border-border text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all cursor-pointer">{rn}</span>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
