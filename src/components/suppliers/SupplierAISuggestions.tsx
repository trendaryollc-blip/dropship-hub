"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import { ScoreRing } from "./supplier-shared";

interface SupplierSuggestion {
  id: string;
  name: string;
  reason: string;
  reliabilityScore: number;
  matchScore: number;
  badge: "gold" | "silver" | "bronze";
}

export default function SupplierAISuggestions() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SupplierSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await safeFetch<{ suggestions?: SupplierSuggestion[] }>(
        `/api/ai/suggestions?uid=${user.uid}&type=suppliers&limit=4`
      );
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setHasLoaded(true);
      }
    } catch {
      // Silently fail
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user && !hasLoaded) {
      fetchSuggestions();
    }
  }, [user, hasLoaded, fetchSuggestions]);

  if (!user || (hasLoaded && suggestions.length === 0)) return null;

  const badgeColors: Record<string, string> = {
    gold: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    silver: "text-slate-300 bg-slate-300/10 border-slate-300/20",
    bronze: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  };

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">AI Recommended Suppliers</h3>
            <p className="text-[10px] text-muted-foreground">Based on your product portfolio and order history</p>
          </div>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-surface transition-colors text-muted-foreground hover:text-foreground"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      {loading && suggestions.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <Loader2 className="h-8 w-8 text-accent mx-auto mb-3 animate-spin" />
          <p className="text-sm text-muted-foreground">AI is analyzing your supplier needs...</p>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((s, i) => (
            <div
              key={s.id}
              className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <Link
                href={`/suppliers/${s.id}`}
                className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-accent/5 hover:border-accent/20 border border-transparent transition-all group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border font-display text-xs font-bold text-foreground">
                  {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">{s.name}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase shrink-0 ${badgeColors[s.badge]}`}>
                      {s.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{s.reason}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ScoreRing score={s.reliabilityScore} size={32} />
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {!loading && !hasLoaded && (
        <button
          onClick={fetchSuggestions}
          className="w-full glass rounded-2xl p-6 text-center hover:bg-accent/5 border border-transparent hover:border-accent/20 transition-all group"
        >
          <Sparkles className="h-8 w-8 text-accent/30 mx-auto mb-2 group-hover:text-accent/60 transition-colors" />
          <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Get AI-recommended suppliers for your products
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            AI matches suppliers to your portfolio, order history, and needs
          </p>
        </button>
      )}
    </div>
  );
}
