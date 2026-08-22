"use client";

import { Star, ThumbsUp, ThumbsDown, Minus, ShieldCheck, MessageSquare } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { ReviewData } from "@/lib/mock-enrichment";

export default function ReviewIntelligence({ data }: { data: ReviewData }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`glass rounded-2xl border border-border overflow-hidden transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Review Intelligence</h3>
            <p className="text-[10px] text-muted-foreground">Analysis of {data.totalReviews.toLocaleString()} reviews</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Overall rating */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-foreground">{data.averageRating}</p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-3 w-3 ${s <= Math.round(data.averageRating) ? "text-amber-400 fill-current" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{data.totalReviews.toLocaleString()} reviews</p>
          </div>
          <div className="flex-1 space-y-1">
            {data.distribution.map((d) => (
              <div key={d.stars} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-6">{d.stars}★</span>
                <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${d.percent}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right">{d.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-emerald-400/5 border border-emerald-400/10">
            <div className="flex items-center gap-1 mb-2">
              <ThumbsUp className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400">Positive</span>
            </div>
            {data.sentiment.positive.slice(0, 3).map((s, i) => (
              <p key={i} className="text-[10px] text-foreground/80 mb-1">"{s}"</p>
            ))}
          </div>
          <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
            <div className="flex items-center gap-1 mb-2">
              <Minus className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground">Neutral</span>
            </div>
            {data.sentiment.neutral.slice(0, 3).map((s, i) => (
              <p key={i} className="text-[10px] text-foreground/60 mb-1">"{s}"</p>
            ))}
          </div>
          <div className="p-3 rounded-xl bg-red-400/5 border border-red-400/10">
            <div className="flex items-center gap-1 mb-2">
              <ThumbsDown className="h-3 w-3 text-red-400" />
              <span className="text-[10px] font-semibold text-red-400">Negative</span>
            </div>
            {data.sentiment.negative.slice(0, 3).map((s, i) => (
              <p key={i} className="text-[10px] text-foreground/60 mb-1">"{s}"</p>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Top Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {data.topKeywords.map((kw) => (
              <span key={kw} className="text-[10px] px-2 py-1 rounded-lg bg-surface/50 border border-border/50 text-muted-foreground">{kw}</span>
            ))}
          </div>
        </div>

        {/* Common praise/complaints */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-emerald-400 font-semibold mb-1.5">Common Praise</p>
            {data.commonPraise.map((p, i) => (
              <div key={i} className="flex items-start gap-1.5 mb-1">
                <span className="text-emerald-400 text-[10px] mt-0.5">+</span>
                <span className="text-[10px] text-foreground/80">{p}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] text-amber-400 font-semibold mb-1.5">Common Complaints</p>
            {data.commonComplaints.map((c, i) => (
              <div key={i} className="flex items-start gap-1.5 mb-1">
                <span className="text-amber-400 text-[10px] mt-0.5">-</span>
                <span className="text-[10px] text-foreground/80">{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trustworthiness */}
        <div className="p-3 rounded-xl bg-accent/5 border border-accent/10 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-accent shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-accent">Reviews Trustworthiness: {data.trustworthyScore}/100</p>
            <p className="text-[10px] text-muted-foreground">Based on review patterns, verified purchases, and review velocity</p>
          </div>
        </div>
      </div>
    </div>
  );
}
