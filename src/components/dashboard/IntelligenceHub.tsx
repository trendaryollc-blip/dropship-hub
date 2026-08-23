"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, Info, AlertOctagon,
  CheckCheck, ArrowUpRight, Sparkles, Activity, ChevronDown, ChevronUp,
  Flame, Truck, Target, Zap, Search, DollarSign,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SmartAlert, AIBriefing, MarketPulseCard, QuickActionStat } from "@/lib/mock-dashboard";

const alertConfig = {
  opportunity: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-l-emerald-400" },
  risk: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", border: "border-l-red-400" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-l-blue-400" },
  warning: { icon: AlertOctagon, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-l-amber-400" },
};

const pulseIconMap: Record<string, typeof Flame> = { flame: Flame, truck: Truck, trending: TrendingUp, target: Target };

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
  const colorMap: Record<string, string> = { "text-emerald-400": "#22c55e", "text-blue-400": "#3b82f6", "text-amber-400": "#f59e0b", "text-purple-400": "#a855f7", "text-orange-400": "#f97316", "text-red-400": "#ef4444" };
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

function SentimentGauge({ value, label }: { value: number; label: string }) {
  const r = 38;
  const circ = Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const getColor = (v: number) => v >= 70 ? "#22c55e" : v >= 40 ? "#f59e0b" : "#ef4444";
  const cx = 5 + (value / 100) * 80;
  const cy = 45 - Math.sin((value / 100) * Math.PI) * 38;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[90px] h-[50px] overflow-hidden">
        <svg viewBox="0 0 90 50" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <path d="M 5 45 A 40 40 0 0 1 85 45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
          <path d="M 5 45 A 40 40 0 0 1 85 45" fill="none" stroke="url(#gaugeGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000" />
          <circle cx={cx} cy={cy} r="4" fill={getColor(value)} stroke="#0f0f17" strokeWidth="2" />
        </svg>
      </div>
      <span className="text-lg font-bold text-foreground -mt-1">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: getColor(value) }}>{label}</span>
    </div>
  );
}

function TypingBriefing({ insights }: { insights: string[] }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);

  useEffect(() => {
    const cur = insights[idx];
    let t: ReturnType<typeof setTimeout>;
    if (!del && text === cur) {
      t = setTimeout(() => setDel(true), 3000);
    } else if (del && text === "") {
      setDel(false);
      setIdx((p) => (p + 1) % insights.length);
    } else {
      t = setTimeout(() => {
        setText(del ? cur.substring(0, text.length - 1) : cur.substring(0, text.length + 1));
      }, del ? 20 : 30);
    }
    return () => clearTimeout(t);
  }, [text, del, idx, insights]);

  return (
    <span className="text-sm text-muted-foreground">
      {text}
      <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse align-middle" />
    </span>
  );
}

function AIBriefingStrip({ briefing }: { briefing: AIBriefing }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  return (
    <div ref={ref} className={`glass rounded-2xl p-4 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 border border-accent/30">
              <Brain className="h-3.5 w-3.5 text-accent" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-xs font-semibold text-foreground">AI is monitoring</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Activity className="h-2.5 w-2.5 text-emerald-400" /> Live
            </span>
            <span className="text-[10px] text-muted-foreground/60 ml-auto hidden sm:block">Last scan: {briefing.lastScan}</span>
          </div>
          <div className="h-5 overflow-hidden">
            <TypingBriefing insights={briefing.insights} />
          </div>
        </div>
        <div className="hidden md:block w-px h-14 bg-border shrink-0" />
        <div className="shrink-0"><SentimentGauge value={briefing.sentiment} label={briefing.sentimentLabel} /></div>
        <div className="hidden md:block w-px h-14 bg-border shrink-0" />
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-400">{briefing.opportunities}</span>
            <span className="text-[10px] text-emerald-400/70 hidden sm:inline">opps</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-400/10 border border-red-400/20">
            <AlertTriangle className="h-3 w-3 text-red-400" />
            <span className="text-[11px] font-semibold text-red-400">{briefing.risks}</span>
            <span className="text-[10px] text-red-400/70 hidden sm:inline">risks</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-400/10 border border-blue-400/20">
            <Zap className="h-3 w-3 text-blue-400" />
            <span className="text-[11px] font-semibold text-blue-400">{briefing.trends}</span>
            <span className="text-[10px] text-blue-400/70 hidden sm:inline">trends</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert, index, onRead }: { alert: SmartAlert; index: number; onRead: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const cfg = alertConfig[alert.type];
  const Icon = cfg.icon;
  return (
    <div ref={ref} className={`relative rounded-xl border-l-2 ${cfg.border} ${alert.read ? "bg-surface/30" : "bg-surface/60"} transition-all duration-500 hover:bg-surface-hover ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${index * 60}ms` }}>
      <div className="flex items-start gap-3 p-3.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
          <Icon className={`h-4 w-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${alert.read ? "text-muted-foreground" : "text-foreground"}`}>{alert.title}</p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground">{alert.confidence}%</span>
              {!alert.read && <span className="w-2 h-2 rounded-full bg-accent" />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Link href={alert.actionHref} onClick={() => onRead(alert.id)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent-hover transition-colors">
              {alert.action} <ArrowUpRight className="h-3 w-3" />
            </Link>
            <span className="text-[10px] text-muted-foreground/60">{alert.timestamp}</span>
            <button onClick={() => setExpanded(!expanded)} className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              <Sparkles className="h-2.5 w-2.5" /> AI Analysis
              {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            </button>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0">
          <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Brain className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-semibold text-accent">AI Analysis</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{alert.aiAnalysis}</p>
            <div className="mt-2"><MiniSparkline points={alert.sparkline} color={cfg.color} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveIntelligenceFeed({ alerts, onRead, onReadAll }: { alerts: SmartAlert[]; onRead: (id: string) => void; onReadAll: () => void }) {
  const [filter, setFilter] = useState<"all" | "opportunity" | "risk" | "info">("all");
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const unread = alerts.filter((a) => !a.read).length;
  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.type === filter);
  const tabs = [
    { key: "all" as const, label: "All", count: alerts.length },
    { key: "opportunity" as const, label: "Opps", count: alerts.filter((a) => a.type === "opportunity").length },
    { key: "risk" as const, label: "Risks", count: alerts.filter((a) => a.type === "risk").length },
    { key: "info" as const, label: "Trends", count: alerts.filter((a) => a.type === "info").length },
  ];
  return (
    <div ref={ref} className={`glass rounded-2xl p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-purple-400/10">
            <Brain className="h-3.5 w-3.5 text-purple-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Live Intelligence Feed</h3>
            {unread > 0 && <p className="text-[10px] text-accent">{unread} new alert{unread > 1 ? "s" : ""}</p>}
          </div>
        </div>
        {unread > 0 && (
          <button onClick={onReadAll} className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 mb-4 p-0.5 bg-surface rounded-xl border border-border">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${filter === tab.key ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}>
            {tab.label}
            <span className={`text-[9px] px-1 py-0.5 rounded ${filter === tab.key ? "bg-white/20" : "bg-surface"}`}>{tab.count}</span>
          </button>
        ))}
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {filtered.map((alert, i) => (
          <AlertCard key={alert.id} alert={alert} index={i} onRead={onRead} />
        ))}
      </div>
    </div>
  );
}

const pulseCardLinks: Record<string, string> = {
  "Trending Products": "/products",
  "Supplier Activity": "/suppliers",
  "Price Changes": "/products",
  "Niche Momentum": "/products/niches",
};

function MarketPulseGrid({ cards }: { cards: MarketPulseCard[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div ref={ref} className={`glass rounded-2xl p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm font-semibold text-foreground">Market Pulse</h3>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => {
          const PIcon = pulseIconMap[card.icon] || Flame;
          const href = pulseCardLinks[card.label] || "/products";
          return (
            <Link key={card.label} href={href} className={`block p-3 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all duration-500 group hover:bg-surface-hover ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="flex items-center justify-between mb-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.color}/10 group-hover:scale-110 transition-transform`}>
                  <PIcon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
                <MiniSparkline points={card.sparkline} color={card.color} />
              </div>
              <p className="font-display text-lg font-bold text-foreground">{card.value}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[10px] text-muted-foreground">{card.label}</p>
                <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-400" : "text-amber-400"}`}>{card.change}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function QuickActionsStrip({ actions }: { actions: QuickActionStat[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const colorMap: Record<string, { icon: typeof Search; gradient: string; bg: string; color: string }> = {
    blue: { icon: Search, gradient: "from-blue-400/20 to-blue-500/5", bg: "bg-blue-400/10", color: "text-blue-400" },
    emerald: { icon: Truck, gradient: "from-emerald-400/20 to-emerald-500/5", bg: "bg-emerald-400/10", color: "text-emerald-400" },
    amber: { icon: DollarSign, gradient: "from-amber-400/20 to-amber-500/5", bg: "bg-amber-400/10", color: "text-amber-400" },
    purple: { icon: Zap, gradient: "from-purple-400/20 to-purple-500/5", bg: "bg-purple-400/10", color: "text-purple-400" },
  };
  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-amber-400" />
        <h3 className="font-display text-sm font-semibold text-foreground">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action, i) => {
          const c = colorMap[action.color] || colorMap.blue;
          const Icon = c.icon;
          return (
            <Link key={action.label} href={action.href} className={`group relative rounded-xl p-4 transition-all duration-500 hover:scale-[1.02] ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${i * 80}ms` }}>
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${c.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="absolute inset-[1px] rounded-xl bg-surface/90 backdrop-blur-xl" />
              <div className="relative z-10">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${c.bg} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`h-4 w-4 ${c.color}`} />
                </div>
                <h4 className="font-display text-xs font-semibold text-foreground mb-0.5">{action.label}</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{action.description}</p>
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="text-sm font-bold text-foreground">{action.stat}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">{action.statLabel}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function IntelligenceHub({
  alerts, onRead, onReadAll, briefing, pulse, actionStats,
}: {
  alerts: SmartAlert[];
  onRead: (id: string) => void;
  onReadAll: () => void;
  briefing: AIBriefing;
  pulse: MarketPulseCard[];
  actionStats: QuickActionStat[];
}) {
  return (
    <div className="space-y-6">
      <AIBriefingStrip briefing={briefing} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveIntelligenceFeed alerts={alerts} onRead={onRead} onReadAll={onReadAll} />
        </div>
        <div className="lg:col-span-1">
          <MarketPulseGrid cards={pulse} />
        </div>
      </div>
      <QuickActionsStrip actions={actionStats} />
    </div>
  );
}
