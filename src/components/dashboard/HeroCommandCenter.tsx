"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap, Truck, Calculator, Brain, ArrowUpRight, Bookmark,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { SmartSearchBar } from "./SmartSearchBar";

export function HeroCommandCenter({
  username, healthScore, trendingCount, suppliersCount, savedCount,
}: {
  username: string; healthScore: number | null;
  trendingCount?: number; suppliersCount?: number; savedCount?: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  // Start empty on both server and client, set time after mount.
  // Deriving the greeting from `new Date()` during render causes a hydration
  // mismatch (server renders "Good morning", client may render "Good evening").
  const [time, setTime] = useState<Date | null>(null);
  const [showHealthTip, setShowHealthTip] = useState(false);

  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const hour = time?.getHours() ?? 12;
  const greet = time === null ? "Welcome" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";

  const healthColor = (healthScore ?? 0) >= 80 ? "#22c55e" : (healthScore ?? 0) >= 60 ? "#f59e0b" : "#ef4444";
  const healthLabel = (healthScore ?? 0) >= 80 ? "Running strong" : (healthScore ?? 0) >= 60 ? "Needs attention" : "Critical";
  const healthTip = (healthScore ?? 0) >= 80
    ? "Your store is performing well. Keep it up!"
    : (healthScore ?? 0) >= 60
      ? "Connect more suppliers or products to improve your score."
      : "Connect your store and add products to boost your score.";
  const healthCta = (healthScore ?? 0) < 80 ? "Connect Store" : null;

  const quickActions = [
    { icon: Zap, label: "Find Products", href: "/products", color: "cyan", badge: trendingCount },
    { icon: Truck, label: "Suppliers", href: "/suppliers", color: "blue", badge: suppliersCount },
    { icon: Calculator, label: "Calculator", href: "/calculator", color: "purple", badge: null },
    { icon: Brain, label: "AI Tools", href: "/ai", color: "pink", badge: null },
  ];

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} -mx-4 md:-mx-6`}>
      <div className="relative overflow-hidden rounded-none md:rounded-3xl border-y md:border border-white/[0.08] hero-card">
        {/* Animated background layers */}
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[var(--accent)]/[0.07] rounded-full blur-[120px] float-orb" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[var(--accent-warm)]/[0.06] rounded-full blur-[100px] float-orb-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent)]/[0.03] rounded-full blur-[80px]" />
        <div className="absolute inset-0 backdrop-blur-2xl" />

        <div className="relative z-10 p-6 md:p-8 lg:p-10">
          {/* Top row: Greeting + Health Score */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-3">
                {/* Animated Rocket Icon */}
                <div className="relative rocket-bounce">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-warm)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
                    <span className="text-2xl md:text-3xl">&#x1F680;</span>
                  </div>
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-warm)] opacity-20 blur-md" />
                </div>
                <div>
                  <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
                    Welcome to <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--gradient-mid)] to-[var(--accent-warm)] bg-clip-text text-transparent glow-text-accent">Dropship Hub</span>
                  </h1>
                  <p className="text-gray-500 text-xs md:text-sm mt-0.5">{greet},</p>
                  <p className="text-gray-400 text-sm md:text-base mt-0.5">
                    Hey <span className="text-white font-medium">{username}</span> &mdash; what&apos;s the move today?
                    {savedCount != null && savedCount > 0 && (
                      <Link href="/saved" className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-purple-300 hover:text-purple-200 transition-colors align-middle">
                        <Bookmark className="h-3 w-3" />
                        {savedCount} saved
                      </Link>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Health Score with Tooltip */}
            {healthScore != null && (
              <div className="flex items-center gap-4 shrink-0">
                <div
                  className="relative group cursor-pointer"
                  onMouseEnter={() => setShowHealthTip(true)}
                  onMouseLeave={() => setShowHealthTip(false)}
                >
                  <svg viewBox="0 0 100 100" className="w-20 h-20 md:w-24 md:h-24 drop-shadow-lg transition-transform duration-300 group-hover:scale-105">
                    <defs>
                      <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={healthColor} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={healthColor} stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="42" fill="url(#healthGrad)" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={healthColor} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - (healthScore ?? 0) / 100)}
                      className="transition-all duration-1500 ease-out -rotate-90" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-xl md:text-2xl font-bold text-white">{healthScore}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: healthColor }}>{healthLabel}</span>
                  </div>

                  {/* Tooltip */}
                  {showHealthTip && (
                    <div className="absolute right-0 top-full mt-3 w-64 p-3 rounded-xl bg-gray-900/95 border border-white/[0.1] shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
                      <p className="text-xs text-gray-300 leading-relaxed">{healthTip}</p>
                      {healthCta && (
                        <Link href="/settings" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                          {healthCta} <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Smart Search Bar */}
          <SmartSearchBar />

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {quickActions.map((a) => {
              const cMap: Record<string, string> = {
                cyan: "bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/20 hover:border-[var(--accent)]/40 hover:shadow-[var(--accent)]/10",
                blue: "bg-[var(--accent-warm)]/10 border-[var(--accent-warm)]/20 text-[var(--accent-warm)] hover:bg-[var(--accent-warm)]/20 hover:border-[var(--accent-warm)]/40 hover:shadow-[var(--accent-warm)]/10",
                purple: "bg-[var(--gradient-mid)]/10 border-[var(--gradient-mid)]/20 text-[var(--gradient-mid)] hover:bg-[var(--gradient-mid)]/20 hover:border-[var(--gradient-mid)]/40 hover:shadow-[var(--gradient-mid)]/10",
                pink: "bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/20 hover:border-[var(--accent)]/40 hover:shadow-[var(--accent)]/10",
              };
              return (
                <Link key={a.href} href={a.href} className={`relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl border ${cMap[a.color]} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}>
                  <a.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">{a.label}</span>
                  {a.badge != null && a.badge > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1 bg-[var(--accent)] text-white`}>
                      {a.badge > 99 ? "99+" : a.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
