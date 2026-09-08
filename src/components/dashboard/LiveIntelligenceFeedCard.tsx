"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Brain, TrendingUp, AlertTriangle, Info, AlertOctagon,
  CheckCheck, ArrowUpRight, Sparkles, Eye, Zap,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SmartAlert } from "@/types/dashboard";

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 48, h = 16;
  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const areaPath = `${pathD} L ${w} ${h} L 0 ${h} Z`;
  const colorMap: Record<string, string> = {
    "text-emerald-400": "#22c55e", "text-blue-400": "#3b82f6",
    "text-amber-400": "#f59e0b", "text-purple-400": "#a855f7",
    "text-orange-400": "#f97316", "text-red-400": "#ef4444",
  };
  const stroke = colorMap[color] || "#3b82f6";
  const gradId = `sp-${color.replace(/[^a-z]/g, "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.2" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const alertConfig = {
  opportunity: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-l-emerald-400" },
  risk: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", border: "border-l-red-400" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-l-blue-400" },
  warning: { icon: AlertOctagon, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-l-amber-400" },
};

function AlertCard({ alert, index, onRead }: { alert: SmartAlert; index: number; onRead: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const cfg = alertConfig[alert.type];
  const Icon = cfg.icon;
  return (
    <div
      ref={ref}
      className={`relative rounded-xl border-l-2 ${cfg.border} ${alert.read ? "bg-surface/30" : "bg-surface/60"} transition-all duration-500 hover:bg-surface-hover ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-3 p-3">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[11px] font-medium ${alert.read ? "text-muted-foreground" : "text-foreground"} leading-snug`}>{alert.title}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground">{alert.confidence}%</span>
              {!alert.read && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">{alert.description}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Link href={alert.actionHref} onClick={() => onRead(alert.id)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent hover:text-accent-hover transition-colors">
              {alert.action} <ArrowUpRight className="h-2.5 w-2.5" />
            </Link>
            <span className="text-[9px] text-muted-foreground/50">{alert.timestamp}</span>
            <button onClick={() => setExpanded(!expanded)} className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors">
              <Sparkles className="h-2 w-2" /> AI
              {expanded ? "Less" : "More"}
            </button>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="p-2.5 rounded-lg bg-accent/5 border border-accent/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Brain className="h-2.5 w-2.5 text-accent" />
              <span className="text-[9px] font-semibold text-accent">AI Analysis</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{alert.aiAnalysis}</p>
            <div className="mt-1.5"><MiniSparkline points={alert.sparkline} color={cfg.color} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveIntelligenceFeedCard({
  alerts,
  onRead,
  onReadAll,
}: {
  alerts: SmartAlert[];
  onRead: (id: string) => void;
  onReadAll: () => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [filter, setFilter] = useState<"all" | "opportunity" | "risk" | "info">("all");
  const unread = alerts.filter((a) => !a.read).length;
  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.type === filter);
  const tabs = [
    { key: "all" as const, label: "All", count: alerts.length },
    { key: "opportunity" as const, label: "Opps", count: alerts.filter((a) => a.type === "opportunity").length },
    { key: "risk" as const, label: "Risks", count: alerts.filter((a) => a.type === "risk").length },
    { key: "info" as const, label: "Trends", count: alerts.filter((a) => a.type === "info").length },
  ];

  return (
    <div
      ref={ref}
      className={`glass rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-purple-400/10 border border-purple-400/20">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">Live Intelligence Feed</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="flex items-center gap-1 text-[9px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
                {unread > 0 && (
                  <span className="text-[9px] text-accent font-semibold">{unread} new</span>
                )}
              </div>
            </div>
          </div>
          {unread > 0 && (
            <button onClick={onReadAll} className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-1 p-0.5 bg-surface rounded-lg border border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                filter === tab.key
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className={`text-[8px] px-1 py-0.5 rounded ${filter === tab.key ? "bg-white/20" : "bg-surface"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto min-h-0">
        {filtered.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-6">No alerts yet</p>
        )}
        {filtered.slice(0, 6).map((alert, i) => (
          <AlertCard key={alert.id} alert={alert} index={i} onRead={onRead} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border/50 bg-surface/30">
        <Link href="/intelligence" className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-accent hover:text-accent-hover transition-colors">
          View Full Intelligence
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
