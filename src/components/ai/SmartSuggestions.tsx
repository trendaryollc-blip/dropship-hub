"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp, DollarSign, AlertTriangle, Sparkles,
  Store, ArrowUpRight, RefreshCw, Bell, ChevronRight,
  Clock, Zap,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import DataUnavailable from "@/components/ui/DataUnavailable";

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

export default function SmartSuggestions() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);

  const uid = user?.uid || "";
  const { data, isLoading: loading, mutate } = useAPI<{ suggestions?: Suggestion[] }>(
    uid ? `/api/ai/suggestions?uid=${uid}` : null,
    { refreshInterval: 300000 }
  );
  const suggestions = data?.suggestions ?? [];

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
          onClick={() => mutate()}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors ml-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Suggestions List */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {suggestions.length === 0 && (
            <DataUnavailable
              title="No suggestions yet"
              reason="Suggestions are generated from your store and profit data — connect a store or track profit to get alerts."
            />
          )}
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
