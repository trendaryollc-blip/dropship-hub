"use client";

import { Star, ThumbsUp, ThumbsDown, Minus, ShieldCheck, MessageSquare } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { ReviewData } from "@/lib/mock-enrichment";

export default function ReviewIntelligence({ data }: { data: ReviewData | null }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  if (!data) {
    return (
      <div ref={ref} className={`review-card transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="p-5 border-b border-border/50 flex items-center gap-3">
          <div className="icon-container-amber"><MessageSquare className="h-4 w-4 text-amber-400" /></div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Review Intelligence</h3>
            <p className="text-[10px] text-muted-foreground">Analysis of reviews</p>
          </div>
        </div>
        <div className="p-8 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Review data unavailable</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Could not fetch reviews for this product</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`review-card transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Header */}
      <div className="p-5 border-b border-border/50 flex items-center gap-3">
        <div className="icon-container-amber">
          <MessageSquare className="h-4 w-4 text-amber-400" />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Review Intelligence</h3>
          <p className="text-[10px] text-muted-foreground">Analysis of {data.totalReviews.toLocaleString()} reviews</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Rating hero display */}
        <div className="grid grid-cols-[auto_1fr] gap-5 items-center">
          <div className="rating-hero-display">
            <p className="font-display text-4xl font-bold text-foreground relative z-10">{data.averageRating}</p>
            <div className="flex items-center gap-0.5 mt-1.5 justify-center relative z-10">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-4 w-4 ${s <= Math.round(data.averageRating) ? "text-amber-400 fill-current" : "text-muted-foreground/20"}`} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 relative z-10">{data.totalReviews.toLocaleString()} reviews</p>
          </div>
          <div className="space-y-1.5">
            {data.distribution.map((d) => (
              <div key={d.stars} className="flex items-center gap-2.5">
                <span className="text-[10px] text-muted-foreground w-6 text-right font-medium">{d.stars}★</span>
                <div className="flex-1 dist-bar">
                  <div className="dist-bar-fill" style={{ width: `${d.percent}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right font-medium">{d.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment — quote-style cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="sentiment-card sentiment-positive">
            <div className="flex items-center gap-1.5 mb-2.5">
              <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Positive</span>
            </div>
            {data.sentiment.positive.slice(0, 3).map((s, i) => (
              <div key={i} className="quote-text border-emerald-400/20 text-emerald-400/80 mb-1.5 last:mb-0">
                {s}
              </div>
            ))}
            {data.sentiment.positive.length === 0 && (
              <p className="text-[10px] text-muted-foreground/50 italic">No data yet</p>
            )}
          </div>
          <div className="sentiment-card sentiment-neutral">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Neutral</span>
            </div>
            {data.sentiment.neutral.slice(0, 3).map((s, i) => (
              <div key={i} className="quote-text border-muted-foreground/20 text-foreground/50 mb-1.5 last:mb-0">
                {s}
              </div>
            ))}
            {data.sentiment.neutral.length === 0 && (
              <p className="text-[10px] text-muted-foreground/50 italic">No data yet</p>
            )}
          </div>
          <div className="sentiment-card sentiment-negative">
            <div className="flex items-center gap-1.5 mb-2.5">
              <ThumbsDown className="h-3.5 w-3.5 text-red-400" />
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Negative</span>
            </div>
            {data.sentiment.negative.slice(0, 3).map((s, i) => (
              <div key={i} className="quote-text border-red-400/20 text-red-400/70 mb-1.5 last:mb-0">
                {s}
              </div>
            ))}
            {data.sentiment.negative.length === 0 && (
              <p className="text-[10px] text-muted-foreground/50 italic">No data yet</p>
            )}
          </div>
        </div>

        {/* Keywords — gradient tags */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2.5 font-medium">Top Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {data.topKeywords.map((kw) => (
              <span key={kw} className="listing-tag">{kw}</span>
            ))}
            {data.topKeywords.length === 0 && (
              <p className="text-[10px] text-muted-foreground/50 italic">No keywords extracted</p>
            )}
          </div>
        </div>

        {/* Praise + Complaints — icon-based */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-emerald-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <ThumbsUp className="h-3 w-3" /> Common Praise
            </p>
            <div className="space-y-1.5">
              {data.commonPraise.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/80">
                  <span className="text-emerald-400 mt-0.5 shrink-0">+</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-amber-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <ThumbsDown className="h-3 w-3" /> Common Complaints
            </p>
            <div className="space-y-1.5">
              {data.commonComplaints.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/80">
                  <span className="text-amber-400 mt-0.5 shrink-0">-</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trustworthiness — premium banner */}
        <div className="trust-banner">
          <div className="icon-container-blue">
            <ShieldCheck className="h-5 w-5 text-accent" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-accent">Reviews Trustworthiness: {data.trustworthyScore}/100</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Based on review patterns, verified purchases, and review velocity</p>
          </div>
        </div>
      </div>
    </div>
  );
}
