"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Truck, Calculator, Sparkles, ArrowDown, Zap } from "lucide-react";
import { useInView } from "@/hooks/useInView";

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
    case "morning": return "from-amber-500/10 via-orange-500/5 to-yellow-500/10";
    case "afternoon": return "from-blue-500/10 via-cyan-500/5 to-sky-500/10";
    case "evening": return "from-purple-500/10 via-indigo-500/5 to-violet-500/10";
    case "night": return "from-slate-500/10 via-blue-900/5 to-indigo-900/10";
    default: return "from-accent/10 via-accent/5 to-accent/10";
  }
}

function getIcon(timeOfDay: string) {
  switch (timeOfDay) {
    case "morning": return "\ud83c\udf05";
    case "afternoon": return "\u2600\ufe0f";
    case "evening": return "\ud83c\udf06";
    case "night": return "\ud83c\udf19";
    default: return "\ud83d\udc4b";
  }
}

function getParticles(timeOfDay: string) {
  switch (timeOfDay) {
    case "morning": return "from-amber-400/20 to-orange-400/10";
    case "afternoon": return "from-blue-400/20 to-cyan-400/10";
    case "evening": return "from-purple-400/20 to-violet-400/10";
    case "night": return "from-slate-400/20 to-blue-400/10";
    default: return "from-accent/20 to-accent/10";
  }
}

const quickActions = [
  { label: "Search Products", description: "Find winning products across 15+ platforms", href: "/products", icon: Search, color: "blue" },
  { label: "Find Suppliers", description: "Discover reliable suppliers worldwide", href: "/suppliers", icon: Truck, color: "emerald" },
  { label: "Calculate Profit", description: "Estimate margins and ROI instantly", href: "/calculator", icon: Calculator, color: "amber" },
  { label: "AI Assistant", description: "Get smart recommendations & insights", href: "/ai", icon: Sparkles, color: "purple" },
];

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  blue: { bg: "bg-blue-400/10", text: "text-blue-400", border: "border-blue-400/20", glow: "group-hover:shadow-blue-400/10" },
  emerald: { bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/20", glow: "group-hover:shadow-emerald-400/10" },
  amber: { bg: "bg-amber-400/10", text: "text-amber-400", border: "border-amber-400/20", glow: "group-hover:shadow-amber-400/10" },
  purple: { bg: "bg-purple-400/10", text: "text-purple-400", border: "border-purple-400/20", glow: "group-hover:shadow-purple-400/10" },
};

export default function GreetingCard({ username }: { username: string }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [timeOfDay, setTimeOfDay] = useState("morning");

  useEffect(() => {
    setTimeOfDay(getTimeOfDay());
    const interval = setInterval(() => setTimeOfDay(getTimeOfDay()), 60000);
    return () => clearInterval(interval);
  }, []);

  const greeting = getGreetingText(timeOfDay);
  const gradient = getGradient(timeOfDay);
  const particleGrad = getParticles(timeOfDay);
  const emoji = getIcon(timeOfDay);

  return (
    <div ref={ref} className={`relative overflow-hidden rounded-3xl border border-border transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Animated background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 bg-surface/40 backdrop-blur-xl" />

      {/* Floating particles */}
      <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br opacity-30 rounded-full blur-3xl animate-pulse" style={{ background: `linear-gradient(135deg, var(--accent), transparent)` }} />
      <div className={`absolute bottom-4 left-4 w-24 h-24 bg-gradient-to-br ${particleGrad} rounded-full blur-2xl animate-pulse`} style={{ animationDelay: "1s" }} />

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-8">
        {/* Greeting */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl sm:text-4xl">{emoji}</span>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  {greeting}, <span className="text-accent">{username}</span>
                </h1>
              </div>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-lg">
              Your dropshipping command center. What would you like to do today?
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground bg-surface/50 px-3 py-1.5 rounded-full border border-border/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {quickActions.map((action, i) => {
            const c = colorMap[action.color];
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className={`group relative flex items-center gap-3 p-3 sm:p-4 rounded-xl border ${c.border} ${c.bg} hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg ${c.glow} ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: `${300 + i * 80}ms` }}
              >
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-5 w-5 ${c.text}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{action.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate hidden sm:block">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Scroll hint */}
        <div className={`flex items-center justify-center gap-2 text-xs text-muted-foreground/60 transition-all duration-700 ${isInView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "800ms" }}>
          <Sparkles className="h-3 w-3 text-accent/40" />
          <span>Below is your <span className="text-accent/60 font-medium">AI Product of the Day</span> handpicked for you</span>
          <ArrowDown className="h-3 w-3 text-accent/40 animate-bounce" />
        </div>
      </div>
    </div>
  );
}
