"use client";

import { ShieldCheck, FileSearch, ShieldX, Eye } from "lucide-react";
import type { ProductAuthenticityResult } from "@/types/product-validation";

const levelConfig = {
  verified: { color: "text-emerald-400", bg: "bg-emerald-400/10", gradient: "from-emerald-400 to-emerald-500", label: "Verified" },
  "likely-genuine": { color: "text-blue-400", bg: "bg-blue-400/10", gradient: "from-blue-400 to-blue-500", label: "Likely Genuine" },
  uncertain: { color: "text-amber-400", bg: "bg-amber-400/10", gradient: "from-amber-400 to-amber-500", label: "Uncertain" },
  "likely-counterfeit": { color: "text-red-400", bg: "bg-red-400/10", gradient: "from-red-400 to-red-500", label: "Likely Counterfeit" },
  flagged: { color: "text-red-400", bg: "bg-red-400/10", gradient: "from-red-400 to-red-500", label: "Flagged" },
};

export default function ProductAuthenticityCard({ data }: { data: ProductAuthenticityResult }) {
  const level = levelConfig[data.authenticityLevel];
  const circumference = 2 * Math.PI * 35;
  const dashoffset = circumference - (data.score / 100) * circumference;

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${level.gradient} opacity-[0.03] pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${level.bg} flex items-center justify-center border border-current/20`}>
            <ShieldCheck className={`h-5 w-5 ${level.color}`} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Product Authenticity</h3>
            <p className="text-[11px] text-muted-foreground">Brand & listing verification</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${level.color} ${level.bg} border-current/20`}>
          {level.label}
        </span>
      </div>

      {/* Score + Brand Verification */}
      <div className="flex items-center gap-6 mb-5 relative">
        <div className="relative w-28 h-28 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="5" className="text-surface" />
            <circle cx="40" cy="40" r="35" fill="none" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashoffset}
              className={level.color} style={{ stroke: "currentColor", transition: "stroke-dashoffset 1s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-display font-black ${level.color}`}>{data.score}</span>
            <span className="text-[8px] text-muted-foreground">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="p-3 rounded-xl bg-surface/40 border border-border/30">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <p className="text-[10px] text-muted-foreground font-medium">Brand Verification</p>
            </div>
            <p className={`text-sm font-bold ${data.brandVerification.isKnown ? "text-emerald-400" : "text-amber-400"}`}>
              {data.brandVerification.isKnown ? "Known Brand" : "Unknown Brand"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{data.brandVerification.notes}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface/40 border border-border/30">
            <div className="flex items-center gap-2 mb-1.5">
              <Eye className="h-4 w-4 text-accent" />
              <p className="text-[10px] text-muted-foreground font-medium">Image Analysis</p>
            </div>
            <p className={`text-sm font-bold ${data.imageAnalysis.isOriginal ? "text-emerald-400" : "text-red-400"}`}>
              {data.imageAnalysis.isOriginal ? "Original" : "Possibly Copied"} ({data.imageAnalysis.matchScore}% match)
            </p>
          </div>
        </div>
      </div>

      {/* Checks Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5 relative">
        <div className={`rounded-xl p-4 border ${data.priceAnalysis.isReasonable ? "bg-emerald-400/5 border-emerald-400/15" : "bg-amber-400/5 border-amber-400/15"}`}>
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Price Check</p>
          <span className={`text-sm font-bold ${data.priceAnalysis.isReasonable ? "text-emerald-400" : "text-amber-400"}`}>
            {data.priceAnalysis.isReasonable ? "Reasonable" : data.priceAnalysis.flag ?? "Deviation"}
          </span>
          <p className="text-[9px] text-muted-foreground mt-1">Avg: ${data.priceAnalysis.marketAvg.toFixed(2)}</p>
        </div>
        <div className={`rounded-xl p-4 border ${data.materialCheck.verified ? "bg-emerald-400/5 border-emerald-400/15" : "bg-amber-400/5 border-amber-400/15"}`}>
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Material Check</p>
          <span className={`text-sm font-bold ${data.materialCheck.verified ? "text-emerald-400" : "text-amber-400"}`}>
            {data.materialCheck.verified ? "Verified" : "Concerns"}
          </span>
          {data.materialCheck.concerns.length > 0 && (
            <p className="text-[9px] text-muted-foreground mt-1 truncate">{data.materialCheck.concerns[0]}</p>
          )}
        </div>
      </div>

      {/* Red Flags */}
      {data.redFlags.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Red Flags</p>
          <div className="space-y-2">
            {data.redFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-400/5 border border-red-400/15">
                <ShieldX className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-red-400/80 leading-relaxed">{flag}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      <div className="p-3 rounded-xl bg-surface/20 border border-border/30">
        <div className="flex items-start gap-2">
          <FileSearch className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[12px] text-foreground/80 leading-relaxed">{data.insight}</p>
        </div>
      </div>
    </div>
  );
}
