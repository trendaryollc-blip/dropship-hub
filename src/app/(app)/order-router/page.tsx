"use client";

import { useState } from "react";
import {
  Route, Clock, DollarSign, TrendingUp,
  ArrowRight, MapPin, Truck, Settings,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useAuth } from "@/components/auth/AuthProvider";
import type { RoutingDecision, RoutingPreferences, RoutingAnalytics, RoutingHistory } from "@/types/order";
import { useAPI } from "@/hooks/useAPI";

// ─── Sub-components ──────────────────────────────────────────────

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 70;
  const h = 24;
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KPICard({ label, value, prefix, suffix, icon: Icon, color, sparkline, delay }: {
  label: string; value: number; prefix?: string; suffix?: string; icon: typeof Route; color: string; sparkline: number[]; delay: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useAnimatedCounter(value, 1500, isInView);
  return (
    <div ref={ref} className={`glass rounded-xl p-3 sm:p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg ${color}/10`}>
          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color}`} />
        </div>
        {sparkline.length > 0 && <MiniSparkline points={sparkline} color={color === "text-emerald-400" ? "#22c55e" : color === "text-blue-400" ? "#3b82f6" : color === "text-purple-400" ? "#a855f7" : "#f59e0b"} />}
      </div>
      <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{prefix || ""}{count.toLocaleString()}{suffix || ""}</p>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function DecisionCard({ decision, delay }: { decision: RoutingDecision; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const statusColors = { routed: "text-emerald-400 bg-emerald-400/10", pending: "text-amber-400 bg-amber-400/10", fallback: "text-blue-400 bg-blue-400/10", failed: "text-red-400 bg-red-400/10" };

  return (
    <div ref={ref} className={`glass rounded-xl p-3 sm:p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">{decision.productImage}</span>
          <div>
            <h4 className="font-display text-xs sm:text-sm font-semibold text-foreground">{decision.productTitle}</h4>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">{decision.orderId} &middot; {decision.customerName} &middot; {decision.customerLocation}</p>
          </div>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold ${statusColors[decision.status]}`}>{decision.status}</span>
      </div>

      {/* Routing Flow */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 p-2 rounded-lg bg-surface text-center">
          <MapPin className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">Customer</p>
          <p className="text-[9px] sm:text-[10px] font-semibold text-foreground">{decision.customerLocation}</p>
        </div>
        <ArrowRight className="h-3 w-3 text-accent shrink-0" />
        <div className="flex-1 p-2 rounded-lg bg-accent/10 border border-accent/20 text-center">
          <Truck className="h-3 w-3 text-accent mx-auto mb-0.5" />
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">Supplier</p>
          <p className="text-[9px] sm:text-[10px] font-semibold text-accent">{decision.selectedSupplier.supplierName}</p>
        </div>
        <ArrowRight className="h-3 w-3 text-accent shrink-0" />
        <div className="flex-1 p-2 rounded-lg bg-surface text-center">
          <Clock className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">Delivery</p>
          <p className="text-[9px] sm:text-[10px] font-semibold text-foreground">{decision.selectedSupplier.shippingDays}d</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <div className="p-1.5 rounded-lg bg-surface text-center">
          <p className="text-[8px] text-muted-foreground">Quality</p>
          <p className="text-[9px] sm:text-[10px] font-bold text-foreground">{decision.selectedSupplier.qualityScore}/100</p>
        </div>
        <div className="p-1.5 rounded-lg bg-surface text-center">
          <p className="text-[8px] text-muted-foreground">Stock</p>
          <p className="text-[9px] sm:text-[10px] font-bold text-foreground">{decision.selectedSupplier.stockLevel}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-surface text-center">
          <p className="text-[8px] text-muted-foreground">Cost</p>
          <p className="text-[9px] sm:text-[10px] font-bold text-emerald-400">${decision.totalCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Reasoning */}
      <div className="p-2 rounded-lg bg-surface">
        <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed">{decision.reasoning}</p>
      </div>

      {/* Alternatives */}
      {decision.alternativeSuppliers.length > 0 && (
        <div className="mt-2">
          <p className="text-[8px] sm:text-[9px] text-muted-foreground mb-1">Alternatives considered:</p>
          <div className="flex flex-wrap gap-1">
            {decision.alternativeSuppliers.map((alt) => (
              <span key={alt.supplierId} className="px-1.5 py-0.5 rounded bg-surface text-[8px] text-muted-foreground">
                {alt.supplierName} ({alt.shippingDays}d, ${alt.totalCost.toFixed(2)})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreferencesPanel({ preferences }: { preferences: RoutingPreferences }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const optColors = { speed: "text-blue-400 bg-blue-400/10 border-blue-400/20", cost: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", balanced: "text-purple-400 bg-purple-400/10 border-purple-400/20" };

  return (
    <div ref={ref} className={`glass rounded-2xl p-4 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Routing Preferences</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-surface">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">Optimization</p>
          <span className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold border ${optColors[preferences.optimization]}`}>{preferences.optimization}</span>
        </div>
        <div className="p-3 rounded-xl bg-surface">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">Max Shipping</p>
          <p className="text-xs sm:text-sm font-bold text-foreground">{preferences.maxShippingDays} days</p>
        </div>
        <div className="p-3 rounded-xl bg-surface">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">Min Quality</p>
          <p className="text-xs sm:text-sm font-bold text-foreground">{preferences.minQualityScore}/100</p>
        </div>
        <div className="p-3 rounded-xl bg-surface">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">Auto Fallback</p>
          <p className={`text-xs sm:text-sm font-bold ${preferences.autoFallback ? "text-emerald-400" : "text-red-400"}`}>{preferences.autoFallback ? "Enabled" : "Disabled"}</p>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPanel({ analytics }: { analytics: RoutingAnalytics }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const total = analytics.supplierDistribution.reduce((sum, s) => sum + s.count, 0) || 1;

  return (
    <div ref={ref} className={`glass rounded-2xl p-4 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-4">Routing Analytics</h3>
      <div className="space-y-3">
        {analytics.supplierDistribution.map((s) => {
          const pct = (s.count / total) * 100;
          return (
            <div key={s.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground">{s.name}</span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-foreground">{s.count} ({pct.toFixed(0)}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: s.color }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-2 rounded-lg bg-surface text-center">
          <p className="text-[9px] text-muted-foreground">Cost Savings</p>
          <p className="text-xs sm:text-sm font-bold text-emerald-400">${analytics.costSavings.toFixed(2)}</p>
        </div>
        <div className="p-2 rounded-lg bg-surface text-center">
          <p className="text-[9px] text-muted-foreground">Avg Time Saved</p>
          <p className="text-xs sm:text-sm font-bold text-blue-400">{analytics.timeSavings}d</p>
        </div>
      </div>
    </div>
  );
}

function HistoryTable({ history }: { history: RoutingHistory[] }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <div ref={ref} className={`glass rounded-2xl p-3 sm:p-5 transition-all duration-700 overflow-x-auto ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-4">Routing History</h3>
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">Order</th>
            <th className="text-left py-2 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">Product</th>
            <th className="text-left py-2 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">Location</th>
            <th className="text-left py-2 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">Supplier</th>
            <th className="text-center py-2 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">Days</th>
            <th className="text-center py-2 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">Cost</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
              <td className="py-2 text-[10px] sm:text-[11px] font-semibold text-foreground">{h.orderId}</td>
              <td className="py-2 text-[10px] sm:text-[11px] text-foreground">{h.productTitle}</td>
              <td className="py-2 text-[10px] sm:text-[11px] text-muted-foreground">{h.customerLocation}</td>
              <td className="py-2 text-[10px] sm:text-[11px] text-accent">{h.selectedSupplier}</td>
              <td className="py-2 text-[10px] sm:text-[11px] text-center text-foreground">{h.shippingDays}d</td>
              <td className="py-2 text-[10px] sm:text-[11px] text-center text-emerald-400">${h.shippingCost.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function OrderRouterPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const { data: dData } = useAPI<{ decisions?: RoutingDecision[] }>(uid ? `/api/orders?type=decisions&uid=${uid}` : null);
  const { data: pData } = useAPI<{ preferences?: RoutingPreferences }>(uid ? `/api/orders?type=preferences&uid=${uid}` : null);
  const { data: aData } = useAPI<{ analytics?: RoutingAnalytics }>(uid ? `/api/orders?type=analytics&uid=${uid}` : null);
  const { data: hData } = useAPI<{ history?: RoutingHistory[] }>(uid ? `/api/orders?type=history&uid=${uid}` : null);
  const decisions = dData?.decisions || [];
  const preferences = pData?.preferences || null;
  const analytics = aData?.analytics || null;
  const history = hData?.history || [];
  const loading = !user || (!dData && !pData);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"queue" | "analytics" | "history" | "settings">("queue");

  const pendingCount = decisions.filter((d) => d.status === "pending").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {error && (<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-center gap-2"><Route className="h-4 w-4 shrink-0" />{error}<button onClick={() => { setError(null); window.location.reload(); }} className="ml-auto text-xs underline">Retry</button></div>)}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Order Router</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">Smart multi-channel order routing. AI selects the optimal supplier based on location, stock, speed, and cost.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-[10px] sm:text-[11px] font-semibold text-amber-400">
              <Clock className="h-3 w-3" />
              {pendingCount} Pending
            </span>
          )}
          <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
            {(["queue", "analytics", "history", "settings"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold capitalize transition-all ${activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading routing data...</p>
        </div>
      ) : (
        <>
          {activeTab === "queue" && analytics && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                <KPICard label="Orders Routed" value={analytics.totalRouted} icon={Route} color="text-emerald-400" sparkline={[12, 14, 15, 16, 18, 19, 20]} delay={0} />
                <KPICard label="Avg Shipping" value={analytics.avgShippingDays} suffix="d" icon={Clock} color="text-blue-400" sparkline={[10, 9.5, 9, 8.5, 8.2, 8, 7.8]} delay={100} />
                <KPICard label="Avg Cost" value={analytics.avgCost} prefix="$" icon={DollarSign} color="text-purple-400" sparkline={[12, 11, 10.5, 10, 9.8, 9.5, 9.2]} delay={200} />
                <KPICard label="Cost Savings" value={analytics.costSavings} prefix="$" icon={TrendingUp} color="text-amber-400" sparkline={[20, 25, 30, 35, 40, 45, 48]} delay={300} />
              </div>
              {decisions.length === 0 ? (
                <div className="text-center py-16 glass rounded-2xl">
                  <Route className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">No routing decisions yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">Orders will appear here once they are routed to suppliers.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="lg:col-span-2 space-y-3">
                    {decisions.slice(0, 6).map((d, i) => (
                      <DecisionCard key={d.id} decision={d} delay={i * 80} />
                    ))}
                  </div>
                  <div className="space-y-4">
                    {preferences && <PreferencesPanel preferences={preferences} />}
                    <AnalyticsPanel analytics={analytics} />
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "analytics" && analytics && (
            <AnalyticsPanel analytics={analytics} />
          )}

          {activeTab === "history" && (
            <HistoryTable history={history} />
          )}

          {activeTab === "settings" && preferences && (
            <div className="max-w-2xl mx-auto">
              <PreferencesPanel preferences={preferences} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
