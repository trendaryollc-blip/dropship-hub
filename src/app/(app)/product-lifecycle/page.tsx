"use client";

import { useState } from "react";
import {
  Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Zap, ArrowRight, Search, Rocket, Sunset,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ProductLifecycle, LifecycleAlert, LifecycleStage, LifecycleStageInfo } from "@/types/product";
import { useAPI } from "@/hooks/useAPI";

const stageInfo: Record<LifecycleStage, LifecycleStageInfo> = {
  discovery: { stage: "discovery", label: "Discovery", color: "text-blue-400", bgColor: "bg-blue-400/10 border-blue-400/20", description: "Initial research and data collection", typicalDuration: "1-2 weeks" },
  testing: { stage: "testing", label: "Testing", color: "text-amber-400", bgColor: "bg-amber-400/10 border-amber-400/20", description: "Validating demand with test ads", typicalDuration: "2-3 weeks" },
  winning: { stage: "winning", label: "Winning", color: "text-emerald-400", bgColor: "bg-emerald-400/10 border-emerald-400/20", description: "Consistent profitable orders", typicalDuration: "4-8 weeks" },
  scaling: { stage: "scaling", label: "Scaling", color: "text-purple-400", bgColor: "bg-purple-400/10 border-purple-400/20", description: "Aggressive growth phase", typicalDuration: "4-12 weeks" },
  saturation: { stage: "saturation", label: "Saturation", color: "text-orange-400", bgColor: "bg-orange-400/10 border-orange-400/20", description: "High competition, declining margins", typicalDuration: "2-4 weeks" },
  sunset: { stage: "sunset", label: "Sunset", color: "text-red-400", bgColor: "bg-red-400/10 border-red-400/20", description: "Phase out and find replacement", typicalDuration: "2-4 weeks" },
};

const stageIcons: Record<LifecycleStage, typeof Activity> = {
  discovery: Search, testing: Zap, winning: CheckCircle2, scaling: Rocket, saturation: AlertTriangle, sunset: Sunset,
};

// ─── Sub-components ──────────────────────────────────────────────

function StagePipeline({ distribution }: { distribution: { stage: LifecycleStage; count: number; products: string[] }[] }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const colors: Record<LifecycleStage, string> = {
    discovery: "#3b82f6", testing: "#f59e0b", winning: "#22c55e",
    scaling: "#a855f7", saturation: "#f97316", sunset: "#ef4444",
  };
  const total = distribution.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div ref={ref} className={`glass rounded-2xl p-4 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="mb-4">
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Lifecycle Pipeline</h3>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground">Products at each stage</p>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 h-6 sm:h-8 rounded-full overflow-hidden mb-4">
        {distribution.map((d, i) => {
          const width = (d.count / total) * 100;
          return (
            <div key={d.stage} className="h-full rounded-full transition-all duration-1000" style={{ width: isInView ? `${width}%` : "0%", backgroundColor: colors[d.stage], transitionDelay: `${i * 150}ms` }} />
          );
        })}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {distribution.map((d) => {
          const info = stageInfo[d.stage];
          const Icon = stageIcons[d.stage];
          return (
            <div key={d.stage} className={`p-2 rounded-lg border ${info.bgColor} text-center`}>
              <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${info.color} mx-auto mb-1`} />
              <p className={`text-xs sm:text-sm font-bold ${info.color}`}>{d.count}</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">{info.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LifecycleCard({ product, delay }: { product: ProductLifecycle; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const info = stageInfo[product.currentStage];
  const Icon = stageIcons[product.currentStage];
  const stageOrder: LifecycleStage[] = ["discovery", "testing", "winning", "scaling", "saturation", "sunset"];
  const stageIdx = stageOrder.indexOf(product.currentStage);

  return (
    <div ref={ref} className={`glass rounded-xl p-3 sm:p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">{product.productImage}</span>
          <div>
            <h4 className="font-display text-xs sm:text-sm font-semibold text-foreground">{product.productTitle}</h4>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">{product.category} &middot; {product.totalDaysTracked} days tracked</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] sm:text-[10px] font-semibold ${info.bgColor} ${info.color}`}>
          <Icon className="h-2.5 w-2.5" />
          {info.label}
        </span>
      </div>

      {/* Stage Pipeline */}
      <div className="flex items-center gap-0.5 mb-3">
        {stageOrder.map((s, i) => (
          <div key={s} className={`flex-1 h-1 rounded-full transition-all ${i <= stageIdx ? stageInfo[s].color.replace("text-", "bg-") : "bg-surface"}`} />
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-surface">
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">Orders</p>
          <p className="text-[10px] sm:text-xs font-bold text-foreground">{product.metrics.totalOrders}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-surface">
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">Revenue</p>
          <p className="text-[10px] sm:text-xs font-bold text-emerald-400">${product.metrics.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-surface">
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">Margin</p>
          <p className="text-[10px] sm:text-xs font-bold text-foreground">{product.metrics.avgProfitMargin}%</p>
        </div>
        <div className="p-1.5 rounded-lg bg-surface">
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">Competition</p>
          <p className={`text-[10px] sm:text-xs font-bold ${product.metrics.competitionCount > 40 ? "text-red-400" : product.metrics.competitionCount > 20 ? "text-amber-400" : "text-emerald-400"}`}>{product.metrics.competitionCount}</p>
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-1.5 mb-2">
        {product.metrics.trendDirection === "rising" ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : product.metrics.trendDirection === "declining" ? <TrendingDown className="h-3 w-3 text-red-400" /> : <Activity className="h-3 w-3 text-amber-400" />}
        <span className={`text-[9px] sm:text-[10px] font-semibold ${product.metrics.trendDirection === "rising" ? "text-emerald-400" : product.metrics.trendDirection === "declining" ? "text-red-400" : "text-amber-400"}`}>{product.metrics.trendDirection} trend &middot; {product.metrics.searchVolume.toLocaleString()} searches/mo</span>
      </div>

      {/* Alerts */}
      {product.alerts.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {product.alerts.slice(0, 2).map((a) => (
            <div key={a.id} className={`p-2 rounded-lg ${a.severity === "critical" ? "bg-red-400/10 border border-red-400/20" : a.severity === "warning" ? "bg-amber-400/10 border border-amber-400/20" : "bg-blue-400/10 border border-blue-400/20"}`}>
              <p className={`text-[9px] sm:text-[10px] font-semibold ${a.severity === "critical" ? "text-red-400" : a.severity === "warning" ? "text-amber-400" : "text-blue-400"}`}>{a.title}</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5">{a.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {product.recommendations.length > 0 && (
        <div className="p-2 rounded-lg bg-surface">
          <p className="text-[9px] sm:text-[10px] font-semibold text-foreground mb-1">Recommendations</p>
          {product.recommendations.map((r, i) => (
            <p key={i} className="text-[8px] sm:text-[9px] text-muted-foreground flex items-start gap-1 mb-0.5">
              <ArrowRight className="h-2.5 w-2.5 mt-0.5 shrink-0 text-accent" />
              {r}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert, delay }: { alert: LifecycleAlert & { productTitle: string; productImage: string }; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const sevColors = {
    info: { bg: "bg-blue-400/10", border: "border-blue-400/20", text: "text-blue-400" },
    warning: { bg: "bg-amber-400/10", border: "border-amber-400/20", text: "text-amber-400" },
    critical: { bg: "bg-red-400/10", border: "border-red-400/20", text: "text-red-400" },
  };
  const c = sevColors[alert.severity];
  const typeIcons = { stage_transition: Activity, competition_spike: AlertTriangle, profit_decline: TrendingDown, trend_shift: TrendingUp, sunset_warning: Sunset };
  const TypeIcon = typeIcons[alert.type] || AlertTriangle;

  return (
    <div ref={ref} className={`flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl ${c.bg} border ${c.border} transition-all duration-500 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <span className="text-base sm:text-lg">{alert.productImage}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <TypeIcon className={`h-3 w-3 ${c.text}`} />
          <p className="text-[10px] sm:text-[11px] font-semibold text-foreground truncate">{alert.title}</p>
          <span className={`px-1 py-0.5 rounded text-[8px] font-semibold ${c.bg} ${c.text}`}>{alert.severity}</span>
        </div>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground">{alert.productTitle}</p>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">{alert.description}</p>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function ProductLifecyclePage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const { data: pData } = useAPI<{ products?: ProductLifecycle[] }>(uid ? `/api/products/lifecycle?type=overview&uid=${uid}` : null);
  const { data: aData } = useAPI<{ alerts?: (LifecycleAlert & { productTitle: string; productImage: string })[] }>(uid ? `/api/products/lifecycle?type=alerts&uid=${uid}` : null);
  const { data: sData } = useAPI<{ stages?: { stage: LifecycleStage; count: number; products: string[] }[] }>(uid ? `/api/products/lifecycle?type=stages&uid=${uid}` : null);
  const products = pData?.products || [];
  const alerts = aData?.alerts || [];
  const stages = sData?.stages || [];
  const loading = !user || (!pData && !sData);
  const [activeTab, setActiveTab] = useState<"pipeline" | "products" | "alerts">("pipeline");
  const [filterStage, setFilterStage] = useState<LifecycleStage | "all">("all");

  const filtered = filterStage === "all" ? products : products.filter((p) => p.currentStage === filterStage);
  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Product Lifecycle</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">Track products from discovery to sunset. AI-powered stage transitions and recommendations.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {criticalAlerts > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-400/10 border border-red-400/20 text-[10px] sm:text-[11px] font-semibold text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {criticalAlerts} Critical
            </span>
          )}
          <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
            {(["pipeline", "products", "alerts"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold capitalize transition-all ${activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading lifecycle data...</p>
        </div>
      ) : (
        <>
          {activeTab === "pipeline" && (
            <>
              <StagePipeline distribution={stages} />
              <div className="space-y-3">
                {alerts.slice(0, 5).map((a, i) => (
                  <AlertRow key={a.id} alert={a} delay={i * 80} />
                ))}
              </div>
            </>
          )}

          {activeTab === "products" && (
            <>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button onClick={() => setFilterStage("all")} className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-all ${filterStage === "all" ? "bg-accent text-white" : "bg-surface text-muted-foreground hover:text-foreground"}`}>All ({products.length})</button>
                {(["discovery", "testing", "winning", "scaling", "saturation", "sunset"] as const).map((s) => {
                  const count = products.filter((p) => p.currentStage === s).length;
                  const info = stageInfo[s];
                  return (
                    <button key={s} onClick={() => setFilterStage(s)} className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-all ${filterStage === s ? `${info.bgColor} ${info.color}` : "bg-surface text-muted-foreground hover:text-foreground"}`}>
                      {info.label} ({count})
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {filtered.map((p, i) => (
                  <LifecycleCard key={p.id} product={p} delay={i * 80} />
                ))}
              </div>
            </>
          )}

          {activeTab === "alerts" && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400/30 mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">All Clear</h3>
                  <p className="text-sm text-muted-foreground">No lifecycle alerts at this time</p>
                </div>
              ) : (
                alerts.map((a, i) => (
                  <AlertRow key={a.id} alert={a} delay={i * 60} />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
