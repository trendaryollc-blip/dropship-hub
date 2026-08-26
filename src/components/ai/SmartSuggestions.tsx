"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, DollarSign, AlertTriangle, Sparkles,
  Store, ArrowUpRight, RefreshCw, Bell, ChevronRight,
  Clock, ShoppingCart, Target, Zap,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface Suggestion {
  id: string;
  type: "price_drop" | "trending" | "competitor" | "opportunity" | "alert" | "store";
  title: string;
  description: string;
  action: string;
  href: string;
  color: string;
  bgColor: string;
  borderColor: string;
  timestamp: string;
}

const iconMap: Record<string, React.ReactNode> = {
  trending: <TrendingUp className="h-4 w-4" />,
  price_drop: <DollarSign className="h-4 w-4" />,
  competitor: <AlertTriangle className="h-4 w-4" />,
  opportunity: <Sparkles className="h-4 w-4" />,
  store: <Store className="h-4 w-4" />,
  alert: <Zap className="h-4 w-4" />,
};

const defaultSuggestions: Suggestion[] = [
  {
    id: "1",
    type: "trending",
    title: "Pet GPS Trackers +340%",
    description: "Low competition, high demand — perfect timing.",
    action: "View Products",
    href: "/products",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/5",
    borderColor: "border-emerald-400/20",
    timestamp: "2m ago",
  },
  {
    id: "2",
    type: "price_drop",
    title: "Earbuds source price dropped",
    description: "$8.50 → $6.20. Margin up to 68%.",
    action: "Calculate",
    href: "/calculator",
    color: "text-blue-400",
    bgColor: "bg-blue-400/5",
    borderColor: "border-blue-400/20",
    timestamp: "15m ago",
  },
  {
    id: "3",
    type: "competitor",
    title: "3 competitors in your niche",
    description: "LED Strip Lights saturating.",
    action: "Analyze",
    href: "/competitors",
    color: "text-amber-400",
    bgColor: "bg-amber-400/5",
    borderColor: "border-amber-400/20",
    timestamp: "1h ago",
  },
  {
    id: "4",
    type: "opportunity",
    title: "Posture Corrector: 72% margin",
    description: "AI Confidence: 89/100.",
    action: "Explore",
    href: "/products",
    color: "text-purple-400",
    bgColor: "bg-purple-400/5",
    borderColor: "border-purple-400/20",
    timestamp: "3h ago",
  },
  {
    id: "5",
    type: "store",
    title: "Connect your store",
    description: "Push products directly to Shopify.",
    action: "Connect",
    href: "/store",
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/5",
    borderColor: "border-cyan-400/20",
    timestamp: "Today",
  },
];

export default function SmartSuggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>(defaultSuggestions);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/suggestions?uid=${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.suggestions?.length) setSuggestions(data.suggestions);
      }
    } catch { /* use defaults */ }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSuggestions();
    const interval = setInterval(fetchSuggestions, 300000);
    return () => clearInterval(interval);
  }, [fetchSuggestions]);

  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2.5 flex-1 text-left"
        >
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
            <Bell className="h-3.5 w-3.5 text-accent" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          </div>
          <span className="text-sm font-semibold text-foreground">Smart Alerts</span>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent/20 px-1.5 text-[10px] font-bold text-accent">
            {suggestions.length}
          </span>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ml-auto ${expanded ? "rotate-90" : ""}`} />
        </button>
        <button
          onClick={() => fetchSuggestions()}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors ml-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Suggestions List */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {suggestions.map((s) => {
            const icon = iconMap[s.type] || <Sparkles className="h-4 w-4" />;
            return (
              <Link
                key={s.id}
                href={s.href}
                className={`group flex items-start gap-3 p-3 rounded-xl border ${s.bgColor} ${s.borderColor} hover:scale-[1.01] transition-all`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.bgColor} ${s.color}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground leading-snug">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-semibold ${s.color} flex items-center gap-0.5`}>
                      {s.action} <ArrowUpRight className="h-2.5 w-2.5" />
                    </span>
                    <span className="text-[9px] text-muted-foreground/50 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> {s.timestamp}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
