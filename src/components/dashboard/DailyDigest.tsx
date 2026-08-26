"use client";

import { useState, useEffect } from "react";
import {
  Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Package,
  Truck, DollarSign, ShoppingCart, RefreshCw, ChevronDown, ChevronUp,
  Sparkles, Activity, ArrowUpRight, Zap, Target, Clock, Mail, Bell, Check, Loader2,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useDigest } from "@/hooks/useDigest";
import { requestNotificationPermission } from "@/lib/firebase-messaging";

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
    <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${color}/10`}>
          <Icon className={`h-3 w-3 ${color}`} />
        </div>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="font-display text-lg font-bold text-foreground">
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
      className={`relative rounded-xl border-l-2 ${cfg.border} bg-surface/60 transition-all duration-500 hover:bg-surface-hover ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
          <Icon className={`h-4 w-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{alert.title}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${sevCfg.bg} ${sevCfg.color}`}>
              {alert.severity}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.description}</p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover transition-colors"
          >
            {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            {expanded ? "Less" : "Details"}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0">
          <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Brain className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-semibold text-accent">AI Analysis</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{alert.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendIndicator({ trend }: { trend: DigestData["weeklyTrend"] }) {
  const Icon = trendIcons[trend.direction];
  const color = trendColors[trend.direction];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${color.replace("text-", "bg-")}/10 border ${color.replace("text-", "border-")}/20`}>
      <Icon className={`h-4 w-4 ${color}`} />
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold ${color}`}>
            {trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : ""}{trend.percentage}%
          </span>
          <span className="text-[10px] text-muted-foreground">vs last week</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{trend.insight}</p>
      </div>
    </div>
  );
}

export default function DailyDigest() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const { digest, loading, error, generateDigest } = useDigest();
  const [expandedRecs, setExpandedRecs] = useState(false);
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    if (!digest && !loading) {
      generateDigest();
    }
  }, [digest, loading, generateDigest]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const checkPermission = () => {
        setPushEnabled(Notification.permission === "granted");
      };
      checkPermission();
    }
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  const handleSendEmail = async () => {
    if (!email || !digest) return;
    setSendingEmail(true);
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: digest.date, email }),
      });
      if (res.ok) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 3000);
      }
    } catch {}
    setSendingEmail(false);
  };

  const handleEnablePush = async () => {
    setEnablingPush(true);
    const token = await requestNotificationPermission();
    if (token) {
      setPushEnabled(true);
    }
    setEnablingPush(false);
  };

  return (
    <div ref={ref} className={`glass rounded-2xl overflow-hidden transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-emerald-400/20 border border-accent/30">
              <Brain className="h-5 w-5 text-accent" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border-2 border-background" />
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-foreground">Daily Intelligence Digest</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-[10px] text-muted-foreground/60">
                  {digest ? formatDate(digest.date) : "Loading..."}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => generateDigest()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Generating..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-400/10 border-b border-red-400/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {digest && (
        <>
          {/* Summary */}
          <div className="p-4 sm:p-5 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-[11px] font-semibold text-foreground">AI Summary</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{digest.summary}</p>
          </div>

          {/* Metrics Grid */}
          <div className="p-4 sm:p-5 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-accent" />
              <span className="text-[11px] font-semibold text-foreground">Key Metrics</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <MetricCard icon={ShoppingCart} label="Orders" value={digest.metrics.orders} color="text-blue-400" />
              <MetricCard icon={DollarSign} label="Revenue" value={digest.metrics.revenue} prefix="$" color="text-emerald-400" />
              <MetricCard icon={TrendingUp} label="Profit" value={digest.metrics.profit} prefix="$" color="text-amber-400" />
              <MetricCard icon={Package} label="Stock Alerts" value={digest.metrics.stockAlerts} color="text-orange-400" />
              <MetricCard icon={Truck} label="Supplier Delays" value={digest.metrics.supplierDelays} color="text-red-400" />
            </div>
          </div>

          {/* Weekly Trend */}
          <div className="p-4 sm:p-5 border-b border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-[11px] font-semibold text-foreground">Weekly Trend</span>
            </div>
            <TrendIndicator trend={digest.weeklyTrend} />
          </div>

          {/* Alerts */}
          {digest.alerts.length > 0 && (
            <div className="p-4 sm:p-5 border-b border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-[11px] font-semibold text-foreground">Proactive Alerts</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 font-semibold">
                  {digest.alerts.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {digest.alerts.map((alert, i) => (
                  <AlertItem key={i} alert={alert} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                <span className="text-[11px] font-semibold text-foreground">Suggested Actions</span>
              </div>
              <button
                onClick={() => setExpandedRecs(!expandedRecs)}
                className="text-[10px] text-accent hover:text-accent-hover transition-colors flex items-center gap-0.5"
              >
                {expandedRecs ? "Less" : "All"}
                {expandedRecs ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
              </button>
            </div>
            <div className="space-y-2">
              {(expandedRecs ? digest.recommendations : digest.recommendations.slice(0, 3)).map((rec, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-surface/50 border border-border/50 hover:bg-surface-hover transition-colors group">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-accent/10 shrink-0 mt-0.5">
                    <Zap className="h-2.5 w-2.5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">{rec}</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-accent transition-all shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
            {digest.recommendations.length > 3 && !expandedRecs && (
              <button
                onClick={() => setExpandedRecs(true)}
                className="mt-2 text-[11px] text-accent hover:text-accent-hover transition-colors"
              >
                +{digest.recommendations.length - 3} more recommendations
              </button>
            )}
          </div>

          {/* Notification Section */}
          <div className="p-4 sm:p-5 border-t border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="h-4 w-4 text-accent" />
              <span className="text-[11px] font-semibold text-foreground">Push Intelligence</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email Digest */}
              <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[10px] font-semibold text-foreground">Email Digest</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Get your daily digest delivered to your inbox</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50"
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={!email || sendingEmail}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-400/10 border border-blue-400/20 text-blue-400 text-[10px] font-semibold hover:bg-blue-400/20 transition-all disabled:opacity-50"
                  >
                    {sendingEmail ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : emailSent ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Mail className="h-3 w-3" />
                    )}
                    {emailSent ? "Sent!" : "Send"}
                  </button>
                </div>
              </div>

              {/* Push Notifications */}
              <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[10px] font-semibold text-foreground">Push Notifications</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Receive alerts when new digests are ready</p>
                {pushEnabled ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-400">Enabled</span>
                  </div>
                ) : (
                  <button
                    onClick={handleEnablePush}
                    disabled={enablingPush}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-400/20 transition-all disabled:opacity-50"
                  >
                    {enablingPush ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Bell className="h-3 w-3" />
                    )}
                    Enable Push
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
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
