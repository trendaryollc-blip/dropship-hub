"use client";

import { useState } from "react";
import { Heart, BarChart3, ExternalLink, Calculator, Award } from "lucide-react";

export default function ProductActionBar({ platform, platformUrl, productTitle, category }: { platform: string; platformUrl?: string; productTitle: string; category?: string }) {
  const [saved, setSaved] = useState(false);

  return (
    <>
      {/* Desktop: sticky side panel */}
      <div className="hidden lg:block fixed right-6 top-1/2 -translate-y-1/2 z-50">
        <div className="glass rounded-2xl border border-border p-2 space-y-1 shadow-2xl shadow-black/20">
          <button onClick={() => setSaved(!saved)} className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${saved ? "bg-red-400/10 text-red-400" : "text-muted-foreground hover:text-foreground hover:bg-surface"}`} title="Save">
            <Heart className={`h-4.5 w-4.5 ${saved ? "fill-current" : ""}`} />
          </button>
          <a href="#price-comparison" className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface transition-all" title="Compare">
            <BarChart3 className="h-4.5 w-4.5" />
          </a>
          <a href={`/suppliers?product=${encodeURIComponent(productTitle)}&category=${encodeURIComponent(category || "")}`} className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface transition-all" title="Find Suppliers">
            <Award className="h-4.5 w-4.5" />
          </a>
          <a href={platformUrl || "#"} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface transition-all" title={`View on ${platform}`}>
            <ExternalLink className="h-4.5 w-4.5" />
          </a>
          <a href="#calculator" className="w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface transition-all" title="Full Analysis">
            <Calculator className="h-4.5 w-4.5" />
          </a>
        </div>
      </div>

      {/* Mobile: sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="glass border-t border-border px-3 py-2 flex items-center gap-1.5">
          <button onClick={() => setSaved(!saved)} className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all ${saved ? "bg-red-400/10 text-red-400" : "text-muted-foreground active:bg-surface"}`}>
            <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            <span className="text-[9px]">{saved ? "Saved" : "Save"}</span>
          </button>
          <a href="#price-comparison" className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-muted-foreground active:bg-surface">
            <BarChart3 className="h-4 w-4" />
            <span className="text-[9px]">Compare</span>
          </a>
          <a href={`/suppliers?product=${encodeURIComponent(productTitle)}&category=${encodeURIComponent(category || "")}`} className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-muted-foreground active:bg-surface">
            <Award className="h-4 w-4" />
            <span className="text-[9px]">Suppliers</span>
          </a>
          <a href={platformUrl || "#"} target="_blank" rel="noopener noreferrer" className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-muted-foreground active:bg-surface">
            <ExternalLink className="h-4 w-4" />
            <span className="text-[9px]">{platform}</span>
          </a>
          <a href="#calculator" className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-muted-foreground active:bg-surface">
            <Calculator className="h-4 w-4" />
            <span className="text-[9px]">Analyze</span>
          </a>
        </div>
      </div>
    </>
  );
}
