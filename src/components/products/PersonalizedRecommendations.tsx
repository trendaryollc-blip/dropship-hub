"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Package, Loader2, RefreshCw } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";

interface Recommendation {
  id: string;
  title: string;
  reason: string;
  query: string;
  confidence: number;
  category: string;
}

export default function PersonalizedRecommendations() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await safeFetch<{ recommendations?: Recommendation[] }>(
        `/api/ai/recommendations?uid=${user.uid}&type=products&limit=5`
      );
      if (data.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
        setHasLoaded(true);
      }
    } catch {
      // Silently fail - recommendations are optional
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user && !hasLoaded) {
      fetchRecommendations();
    }
  }, [user, hasLoaded, fetchRecommendations]);

  if (!user || (hasLoaded && recommendations.length === 0)) return null;

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Recommended for You</h3>
            <p className="text-[10px] text-muted-foreground">Based on your saved products and search history</p>
          </div>
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-surface transition-colors text-muted-foreground hover:text-foreground"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      {loading && recommendations.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <Loader2 className="h-8 w-8 text-accent mx-auto mb-3 animate-spin" />
          <p className="text-sm text-muted-foreground">AI is analyzing your portfolio...</p>
        </div>
      )}

      {!loading && recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <div
              key={rec.id}
              className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <Link
                href={`/products?q=${encodeURIComponent(rec.query)}`}
                className="glass rounded-xl p-3 flex items-center gap-3 hover:bg-accent/5 hover:border-accent/20 border border-transparent transition-all group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Package className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{rec.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{rec.reason}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-1.5 rounded-full bg-surface overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${rec.confidence}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{rec.confidence}%</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {!loading && !hasLoaded && (
        <button
          onClick={fetchRecommendations}
          className="w-full glass rounded-2xl p-6 text-center hover:bg-accent/5 border border-transparent hover:border-accent/20 transition-all group"
        >
          <Sparkles className="h-8 w-8 text-accent/30 mx-auto mb-2 group-hover:text-accent/60 transition-colors" />
          <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Get personalized product recommendations
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            AI analyzes your portfolio and suggests winning products
          </p>
        </button>
      )}
    </div>
  );
}
