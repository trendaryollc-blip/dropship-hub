"use client";

import { useState, useEffect } from "react";
import {
  Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Package,
  Truck, DollarSign, ShoppingCart, RefreshCw,
  Sparkles, Activity, Zap, Target, Clock,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useDigest } from "@/hooks/useDigest";

interface DigestMetrics {
  orders: number;
  revenue: number;
  profit: number;
  stockAlerts: number;
  supplierDelays: number;
}

interface DigestAlert {
  type: "stock" | "supplier" | "adSpend" | "trend";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

interface DigestData {
  date: string;
  summary: string;
  metrics: DigestMetrics;
  alerts: DigestAlert[];
  recommendations: string[];
  weeklyTrend: {
    direction: "up" | "down" | "stable";
    percentage: number;
    insight: string;
  };
}

const alertConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string; border: string }> = {
  stock: { icon: Package, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-l-amber-400" },
  supplier: { icon: Truck, color: "text-red-400", bg: "bg-red-400/10", border: "border-l-red-400" },
  adSpend: { icon: DollarSign, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-l-purple-400" },
  trend: { icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-l-blue-400" },
};

const severityConfig: Record<string, { color: string; bg: string }> = {
  low: { color: "text-blue-400", bg: "bg-blue-400/10" },
  medium: { color: "text-amber-400", bg: "bg-amber-400/10" },
  high: { color: "text-red-400", bg: "bg-red-400/10" },
};

const trendIcons = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColors = { up: "text-emerald-400", down: "text-red-400", stable: "text-amber-400" };

function MetricCard({ icon: Icon, label, value, prefix, color }: { icon: typeof ShoppingCart; label: string; value: number; prefix?: string; color: string }) {
  return (
    <div className="p-2 rounded-lg bg-surface/50 border border-border/50">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`flex h-5 w-5 items-center justify-center rounded-md ${color}/10`}>
          <Icon className={`h-2.5 w-2.5 ${color}`} />
        </div>
        <span className="text-[9px] text-muted-foreground">{label}</span>
      </div>
      <p className="font-display text-sm font-bold text-foreground">
        {prefix}{typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function AlertItem({ alert, index }: { alert: DigestAlert; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const cfg = alertConfig[alert.type];
  const Icon = cfg.icon;
  const sevCfg = severityConfig[alert.severity];

  return (
    <div
      ref={ref}
      className={`relative rounded-lg border-l-2 ${cfg.border} bg-surface/60 transition-all duration-500 hover:bg-surface-hover ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-2 p-2.5">
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${cfg.bg}`}>
          <Icon className={`h-3 w-3 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1.5">
            <p className="text-[11px] font-medium text-foreground">{alert.title}</p>
            <span className={`text-[8px] font-semibold px-1 py-0.5 rounded ${sevCfg.bg} ${sevCfg.color}`}>
              {alert.severity}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: DigestData["weeklyTrend"] }) {
  const Icon = trendIcons[trend.direction];
  const color = trendColors[trend.direction];
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${color.replace("text-", "bg-")}/10 border ${color.replace("text-", "border-")}/20`}>
      <Icon className={`h-3 w-3 ${color}`} />
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold ${color}`}>
            {trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}{trend.percentage}%
          </span>
          <span className="text-[9px] text-muted-foreground">vs last week</span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-relaxed mt-0.5">{trend.insight}</p>
      </div>
    </div>
  );
}

export default function DailyDigest() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const { digest, loading, error, generateDigest } = useDigest();

  useEffect(() => {
    if (!digest && !loading) {
      const today = new Date().toISOString().slice(0, 10);
      const lastGenerated = localStorage.getItem("digest_last_generated");
      if (lastGenerated === today) return;
      generateDigest().then(() => {
        localStorage.setItem("digest_last_generated", today);
      });
    }
  }, [digest, loading, generateDigest]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  return (
    <div ref={ref} className={`glass rounded-2xl overflow-hidden transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-emerald-400/20 border border-accent/30">
              <Brain className="h-4 w-4 text-accent" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse border-2 border-background" />
            </div>
            <div>
              <h3 className="font-display text-xs sm:text-sm font-bold text-foreground">Daily Intelligence Digest</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                <span className="text-[9px] text-muted-foreground/60">
                  {digest ? formatDate(digest.date) : "Loading..."}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => generateDigest()}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[10px] font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-2.5 w-2.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-400/10 border-b border-red-400/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {digest && (
        <div className="max-h-[520px] overflow-y-auto">
          {/* Summary */}
          <div className="p-3 sm:p-4 border-b border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-semibold text-foreground">AI Summary</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{digest.summary}</p>
          </div>

          {/* Metrics Grid */}
          <div className="p-3 sm:p-4 border-b border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-semibold text-foreground">Key Metrics</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <MetricCard icon={ShoppingCart} label="Orders" value={digest.metrics.orders} color="text-blue-400" />
              <MetricCard icon={DollarSign} label="Revenue" value={digest.metrics.revenue} prefix="$" color="text-emerald-400" />
              <MetricCard icon={TrendingUp} label="Profit" value={digest.metrics.profit} prefix="$" color="text-amber-400" />
              <MetricCard icon={Package} label="Stock Alerts" value={digest.metrics.stockAlerts} color="text-orange-400" />
              <MetricCard icon={Truck} label="Delays" value={digest.metrics.supplierDelays} color="text-red-400" />
            </div>
          </div>

          {/* Weekly Trend */}
          <div className="p-3 sm:p-4 border-b border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-semibold text-foreground">Weekly Trend</span>
            </div>
            <TrendIndicator trend={digest.weeklyTrend} />
          </div>

          {/* Alerts */}
          {digest.alerts.length > 0 && (
            <div className="p-3 sm:p-4 border-b border-border/50">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-semibold text-foreground">Alerts</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 font-semibold">
                  {digest.alerts.length}
                </span>
              </div>
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {digest.alerts.slice(0, 3).map((alert, i) => (
                  <AlertItem key={i} alert={alert} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-semibold text-foreground">Suggested Actions</span>
            </div>
            <div className="space-y-1.5">
              {digest.recommendations.slice(0, 2).map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-surface/50 border border-border/50 hover:bg-surface-hover transition-colors group">
                  <div className="flex h-4 w-4 items-center justify-center rounded bg-accent/10 shrink-0 mt-0.5">
                    <Zap className="h-2 w-2 text-accent" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors flex-1">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!digest && !loading && (
        <div className="p-8 text-center">
          <Brain className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No digest available</p>
          <button
            onClick={() => generateDigest()}
            className="mt-3 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all"
          >
            Generate Digest
          </button>
        </div>
      )}
    </div>
  );
}
