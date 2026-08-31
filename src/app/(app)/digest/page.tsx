"use client";

import { useState } from "react";
import {
  Brain, TrendingUp, AlertTriangle, Package, Truck,
  DollarSign, ShoppingCart, RefreshCw, Send, Mail, Clock, Zap,
  CheckCircle2, BarChart3, ArrowRight,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import { logger } from "@/lib/logger";

// ─── Types ───────────────────────────────────────────────────────

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

function KPICard({ label, value, prefix, suffix, icon: Icon, color, sparkline, delay }: {
  label: string; value: number; prefix?: string; suffix?: string; icon: typeof DollarSign; color: string; sparkline: number[]; delay: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useAnimatedCounter(value, 1500, isInView);
  return (
    <div ref={ref} className={`glass rounded-xl p-3 sm:p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg ${color}/10 group-hover:scale-110 transition-transform`}>
          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color}`} />
        </div>
        {sparkline.length > 0 && <MiniSparkline points={sparkline} color={color === "text-emerald-400" ? "#22c55e" : color === "text-blue-400" ? "#3b82f6" : color === "text-amber-400" ? "#f59e0b" : "#a855f7"} />}
      </div>
      <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{prefix || ""}{count.toLocaleString()}{suffix || ""}</p>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}

function TrendCard({ trend, delay }: { trend: DigestData["weeklyTrend"]; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const colors = { up: "text-emerald-400", down: "text-red-400", stable: "text-amber-400" };
  const bgColors = { up: "bg-emerald-400/10 border-emerald-400/20", down: "bg-red-400/10 border-red-400/20", stable: "bg-amber-400/10 border-amber-400/20" };
  const arrows = { up: "\u2191", down: "\u2193", stable: "\u2192" };

  return (
    <div ref={ref} className={`glass rounded-2xl p-4 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Weekly Trend</h3>
      </div>
      <div className={`p-4 rounded-xl border ${bgColors[trend.direction]}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-3xl font-bold ${colors[trend.direction]}`}>{arrows[trend.direction]}</span>
          <div>
            <span className={`text-xl font-bold ${colors[trend.direction]}`}>{trend.direction === "up" ? "+" : ""}{trend.percentage}%</span>
            <span className="text-xs text-muted-foreground ml-2">vs last week</span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{trend.insight}</p>
      </div>
    </div>
  );
}

function AlertCard({ alert, delay }: { alert: DigestAlert; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const sevColors = {
    low: { bg: "bg-blue-400/10", border: "border-blue-400/20", icon: "text-blue-400", badge: "text-blue-400 bg-blue-400/10" },
    medium: { bg: "bg-amber-400/10", border: "border-amber-400/20", icon: "text-amber-400", badge: "text-amber-400 bg-amber-400/10" },
    high: { bg: "bg-red-400/10", border: "border-red-400/20", icon: "text-red-400", badge: "text-red-400 bg-red-400/10" },
  };
  const c = sevColors[alert.severity];
  const typeIcons = { stock: Package, supplier: Truck, adSpend: DollarSign, trend: TrendingUp };
  const TypeIcon = typeIcons[alert.type] || AlertTriangle;
  const typeLabels = { stock: "Low Stock", supplier: "Supplier Delay", adSpend: "Ad Spend", trend: "Market Trend" };

  return (
    <div ref={ref} className={`p-3 sm:p-4 rounded-xl ${c.bg} border ${c.border} transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg ${c.bg} shrink-0`}>
          <TypeIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${c.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">{alert.title}</h4>
            <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-semibold ${c.badge}`}>{alert.severity}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">{typeLabels[alert.type]}</p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ text, delay }: { text: string; index: number; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  return (
    <div ref={ref} className={`flex items-start gap-2.5 sm:gap-3 p-3 rounded-xl bg-surface border border-border hover:border-accent/20 transition-all duration-500 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 shrink-0">
        <Zap className="h-3 w-3 text-accent" />
      </div>
      <p className="text-xs sm:text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function DigestPage() {
  const { user } = useAuth();
  const { data: digestData, mutate: refetchDigest } = useAPI<{ digests?: DigestData[] }>("/api/digest");
  const [selectedDigest, setSelectedDigest] = useState<DigestData | null>(null);
  const digest = selectedDigest || digestData?.digests?.[0] || null;
  const history = digestData?.digests?.slice(0, 7) || [];
  const [generating, setGenerating] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const generateDigest = async (sendEmail?: boolean) => {
    setGenerating(true);
    try {
      const data = await safeFetch<DigestData>("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().split("T")[0], email: sendEmail ? email : undefined, notify: sendEmail }),
      });
      if (data?.date) {
        setSelectedDigest(null);
        refetchDigest();
        if (sendEmail) setEmailSent(true);
      }
    } catch (err) {
      logger.error("Failed to generate digest", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setGenerating(false);
    }
  };


  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1">Daily Intelligence Digest</h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">AI-generated daily summary of your business performance, alerts, and actionable recommendations.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => generateDigest()} disabled={generating} className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-accent text-white text-xs sm:text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-all">
            {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            {generating ? "Generating..." : "Generate Digest"}
          </button>
        </div>
      </div>

      {/* Email Digest */}
      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Mail className="h-4 w-4 text-accent shrink-0" />
            <p className="text-xs sm:text-sm text-foreground font-medium">Get daily digest via email</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="px-3 py-2 rounded-xl bg-surface border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 w-48 sm:w-64" />
            <button onClick={() => generateDigest(true)} disabled={generating || !email} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover disabled:opacity-50 transition-all">
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </div>
        {emailSent && (
          <div className="mt-3 p-2 rounded-lg bg-emerald-400/10 border border-emerald-400/20">
            <p className="text-[10px] sm:text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Digest sent successfully! Check your inbox.</p>
          </div>
        )}
      </div>

      {digest ? (
        <>
          {/* Date Header */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-xs sm:text-sm">{new Date(digest.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          </div>

          {/* AI Summary */}
          <div className="glass rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-accent" />
              <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">AI Summary</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{digest.summary}</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <KPICard label="Orders" value={digest.metrics.orders} icon={ShoppingCart} color="text-blue-400" sparkline={[digest.metrics.orders * 0.8, digest.metrics.orders * 0.9, digest.metrics.orders * 0.85, digest.metrics.orders * 0.95, digest.metrics.orders * 0.92, digest.metrics.orders * 0.98, digest.metrics.orders]} delay={0} />
            <KPICard label="Revenue" value={digest.metrics.revenue} prefix="$" icon={DollarSign} color="text-emerald-400" sparkline={[digest.metrics.revenue * 0.82, digest.metrics.revenue * 0.88, digest.metrics.revenue * 0.85, digest.metrics.revenue * 0.93, digest.metrics.revenue * 0.9, digest.metrics.revenue * 0.97, digest.metrics.revenue]} delay={100} />
            <KPICard label="Profit" value={digest.metrics.profit} prefix="$" icon={TrendingUp} color="text-purple-400" sparkline={[digest.metrics.profit * 0.78, digest.metrics.profit * 0.85, digest.metrics.profit * 0.82, digest.metrics.profit * 0.91, digest.metrics.profit * 0.88, digest.metrics.profit * 0.95, digest.metrics.profit]} delay={200} />
            <KPICard label="Stock Alerts" value={digest.metrics.stockAlerts} icon={Package} color="text-amber-400" sparkline={[digest.metrics.stockAlerts + 3, digest.metrics.stockAlerts + 2, digest.metrics.stockAlerts + 4, digest.metrics.stockAlerts + 1, digest.metrics.stockAlerts + 2, digest.metrics.stockAlerts + 1, digest.metrics.stockAlerts]} delay={300} />
          </div>

          {/* Weekly Trend */}
          <TrendCard trend={digest.weeklyTrend} delay={0} />

          {/* Alerts */}
          {digest.alerts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Proactive Alerts ({digest.alerts.length})</h3>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {digest.alerts.map((a, i) => (
                  <AlertCard key={i} alert={a} delay={i * 80} />
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-accent" />
              <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Suggested Actions ({digest.recommendations.length})</h3>
            </div>
            <div className="space-y-2">
              {digest.recommendations.map((r, i) => (
                <RecommendationCard key={i} text={r} index={i} delay={i * 60} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="glass rounded-2xl p-8 sm:p-16 text-center">
          <Brain className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No digest generated yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">Click the button above to generate your first AI-powered daily intelligence digest with metrics, alerts, and recommendations.</p>
          <button onClick={() => generateDigest()} disabled={generating} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-all">
            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            Generate First Digest
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <div className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-3">Recent Digests</h3>
          <div className="space-y-2">
            {history.slice(1).map((d, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer" onClick={() => setSelectedDigest(d)}>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs sm:text-sm text-foreground">{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground">{d.metrics.orders} orders</span>
                  <span className="text-[10px] sm:text-[11px] text-emerald-400 font-semibold">${d.metrics.revenue}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
