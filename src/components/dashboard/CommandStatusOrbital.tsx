"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign, ShoppingCart, TrendingUp, Store, Truck, Package,
  ArrowUpRight, Zap, Activity,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import type { ContextualAction } from "@/types/dashboard";

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function getGreetingText(timeOfDay: string) {
  switch (timeOfDay) {
    case "morning": return "Good morning";
    case "afternoon": return "Good afternoon";
    case "evening": return "Good evening";
    case "night": return "Good night";
    default: return "Hello";
  }
}

function getGradient(timeOfDay: string) {
  switch (timeOfDay) {
    case "morning": return "from-amber-500/8 via-orange-500/4 to-yellow-500/8";
    case "afternoon": return "from-blue-500/8 via-cyan-500/4 to-sky-500/8";
    case "evening": return "from-purple-500/8 via-indigo-500/4 to-violet-500/8";
    case "night": return "from-slate-500/8 via-blue-900/4 to-indigo-900/8";
    default: return "from-accent/8 via-accent/4 to-accent/8";
  }
}

function getEmoji(timeOfDay: string) {
  switch (timeOfDay) {
    case "morning": return "\ud83c\udf05";
    case "afternoon": return "\u2600\ufe0f";
    case "evening": return "\ud83c\udf06";
    case "night": return "\ud83c\udf19";
    default: return "\ud83d\udc4b";
  }
}

function HealthRing({ score, size = 100 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / 100, 1);
  const offset = circumference * (1 - pct);
  const center = size / 2;

  const getColor = (v: number) => {
    if (v >= 80) return ["#22c55e", "#10b981"];
    if (v >= 60) return ["#f59e0b", "#f97316"];
    if (v >= 40) return ["#f97316", "#ef4444"];
    return ["#ef4444", "#dc2626"];
  };
  const [c1, c2] = getColor(score);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 w-full h-full animate-orbital opacity-20">
        <circle cx={center} cy={center} r={radius + 3} fill="none" stroke="url(#orbitalGrad)" strokeWidth="1" strokeDasharray="4 8" />
        <defs>
          <linearGradient id="orbitalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-warm)" />
          </linearGradient>
        </defs>
      </svg>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke="url(#healthGrad)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold text-foreground leading-none">{score}</span>
        <span className="text-[8px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: c1 }}>Health</span>
      </div>
      <div className="absolute inset-0 rounded-full animate-status-pulse" style={{ background: `radial-gradient(circle, ${c1}15, transparent 70%)` }} />
    </div>
  );
}

function KPIPill({ icon: Icon, label, value, prefix, change, color }: {
  icon: typeof DollarSign;
  label: string;
  value: number;
  prefix?: string;
  change?: number;
  color: string;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const animatedValue = useAnimatedCounter(value, 800, isInView);

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/20" },
    blue: { bg: "bg-blue-400/10", text: "text-blue-400", border: "border-blue-400/20" },
    amber: { bg: "bg-amber-400/10", text: "text-amber-400", border: "border-amber-400/20" },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${c.border} ${c.bg} backdrop-blur-sm transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${c.text}`} />
      </div>
      <div>
        <p className="text-[8px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <div className="flex items-center gap-1">
          <p className="font-display text-sm font-bold text-foreground">{prefix}{animatedValue.toLocaleString()}</p>
          {change !== undefined && change !== 0 && (
            <span className={`text-[9px] font-semibold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {change >= 0 ? "+" : ""}{change}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ label, count, icon: Icon, color, href }: {
  label: string;
  count: number;
  icon: typeof Store;
  color: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface/50 border border-border hover:border-accent/20 transition-all group">
      <div className="relative">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${color.replace("text-", "bg-")} animate-pulse`} />
      </div>
      <span className="text-[9px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
      <span className={`text-[9px] font-bold ${color}`}>{count}</span>
    </Link>
  );
}

interface CommandStatusOrbitalProps {
  username: string;
  healthScore: number;
  revenue: number;
  orders: number;
  profit: number;
  revenueChange?: number;
  ordersChange?: number;
  profitChange?: number;
  storesConnected: number;
  suppliersActive: number;
  pendingOrders: number;
  contextualActions: ContextualAction[];
}

export default function CommandStatusOrbital({
  username,
  healthScore,
  revenue,
  orders,
  profit,
  revenueChange = 0,
  ordersChange = 0,
  profitChange = 0,
  storesConnected,
  suppliersActive,
  pendingOrders,
  contextualActions: _contextualActions,
}: CommandStatusOrbitalProps) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [timeOfDay, setTimeOfDay] = useState(() => getTimeOfDay());

  useEffect(() => {
    const interval = setInterval(() => setTimeOfDay(getTimeOfDay()), 60000);
    return () => clearInterval(interval);
  }, []);

  const greeting = getGreetingText(timeOfDay);
  const gradient = getGradient(timeOfDay);
  const emoji = getEmoji(timeOfDay);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-3xl border border-border transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 bg-surface/30 backdrop-blur-xl" />
      <div className="absolute top-4 right-4 w-40 h-40 bg-gradient-to-br opacity-20 rounded-full blur-3xl animate-pulse" style={{ background: "linear-gradient(135deg, var(--accent), transparent)" }} />
      <div className="absolute bottom-4 left-8 w-28 h-28 bg-gradient-to-br from-emerald-400/15 to-emerald-400/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1.5s" }} />

      <div className="relative z-10 p-5 sm:p-6">
        {/* Row 1: Ring + Greeting Center + Status Right */}
        <div className="flex items-center gap-5 mb-4">
          {/* Left: Health Ring */}
          <HealthRing score={healthScore} />

          {/* Center: Greeting (centered) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{emoji}</span>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                {greeting}, <span className="text-accent">{username}</span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Your dropshipping command center is{" "}
              <span className={healthScore >= 70 ? "text-emerald-400 font-medium" : healthScore >= 40 ? "text-amber-400 font-medium" : "text-red-400 font-medium"}>
                {healthScore >= 70 ? "running strong" : healthScore >= 40 ? "needs attention" : "critical"}
              </span>
            </p>
          </div>

          {/* Right: Status dots */}
          <div className="hidden md:flex flex-wrap items-center gap-1.5 shrink-0">
            <StatusDot label="Stores" count={storesConnected} icon={Store} color="text-emerald-400" href="/store" />
            <StatusDot label="Suppliers" count={suppliersActive} icon={Truck} color="text-blue-400" href="/suppliers" />
            {pendingOrders > 0 && (
              <StatusDot label="Pending" count={pendingOrders} icon={Package} color="text-amber-400" href="/fulfillment" />
            )}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface/50 border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-medium text-muted-foreground">Live</span>
            </div>
          </div>
        </div>

        {/* Row 2: KPI Pills (evenly distributed) */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <KPIPill icon={DollarSign} label="Revenue" value={revenue} prefix="$" change={revenueChange} color="emerald" />
          <KPIPill icon={ShoppingCart} label="Orders" value={orders} change={ordersChange} color="blue" />
          <KPIPill icon={TrendingUp} label="Profit" value={profit} prefix="$" change={profitChange} color="amber" />
        </div>

        {/* Row 3: Quick Action Chips (evenly distributed) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link href="/products" className="group flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 hover:shadow-[0_0_20px_rgba(var(--glow-color),0.15)] transition-all">
            <Zap className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
            Search Products
            <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link href="/suppliers" className="group flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-400/20 transition-all">
            <Truck className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
            Find Suppliers
            <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link href="/calculator" className="group flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 transition-all">
            <DollarSign className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
            Calculate Profit
            <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link href="/ai" className="group flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-400/10 border border-purple-400/20 text-purple-400 text-xs font-semibold hover:bg-purple-400/20 transition-all">
            <Activity className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
            AI Assistant
            <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>

        {/* Mobile status row */}
        <div className="flex md:hidden flex-wrap items-center justify-center gap-1.5 mt-3">
          <StatusDot label="Stores" count={storesConnected} icon={Store} color="text-emerald-400" href="/store" />
          <StatusDot label="Suppliers" count={suppliersActive} icon={Truck} color="text-blue-400" href="/suppliers" />
          {pendingOrders > 0 && (
            <StatusDot label="Pending" count={pendingOrders} icon={Package} color="text-amber-400" href="/fulfillment" />
          )}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-surface/50 border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-medium text-muted-foreground">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
