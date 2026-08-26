"use client";

import { useState } from "react";
import { Copy, Check, Lightbulb, Tag, FileText, DollarSign, ShoppingBag, Sparkles } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { ListingSuggestion } from "@/lib/mock-enrichment";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className={`copy-btn ${copied ? "copy-btn-copied" : ""}`} title="Copy to clipboard">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function ListingOptimization({ data, platform }: { data: ListingSuggestion | null; platform?: string }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  if (!data) {
    return (
      <div ref={ref} className={`listing-card transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="p-5 border-b border-border/50 flex items-center gap-3 listing-header-glow">
          <div className="icon-container-purple"><Lightbulb className="h-4 w-4 text-purple-400" /></div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Listing Optimization</h3>
            <p className="text-[10px] text-muted-foreground">AI-powered suggestions for your store</p>
          </div>
        </div>
        <div className="p-8 text-center">
          <Lightbulb className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Listing suggestions unavailable</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Could not generate listing optimization for this product</p>
        </div>
      </div>
    );
  }
  const tip = data.platformTips.find((t) => t.platform.toLowerCase().includes(platform?.toLowerCase() || "")) || data.platformTips[0];

  return (
    <div ref={ref} className={`listing-card transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Header with gradient glow */}
      <div className="p-5 border-b border-border/50 flex items-center gap-3 listing-header-glow">
        <div className="icon-container-purple">
          <Lightbulb className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Listing Optimization</h3>
          <p className="text-[10px] text-muted-foreground">AI-powered suggestions for your store</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Suggested title — premium display */}
        <div className="listing-block">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Suggested Title</span>
            </div>
            <CopyBtn text={data.title} />
          </div>
          <p className="listing-title-display">{data.title}</p>
        </div>

        {/* Description — quote block style */}
        <div className="listing-block">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Description</span>
            </div>
            <CopyBtn text={data.description} />
          </div>
          <p className="listing-description">{data.description}</p>
        </div>

        {/* Tags — gradient pills */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Tag className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Suggested Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(data.tags)].map((t, i) => (
              <span key={`${t}-${i}`} className="listing-tag">{t}</span>
            ))}
          </div>
        </div>

        {/* Price range — prominent */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-400/5 to-emerald-400/3 border border-emerald-400/10">
          <div className="icon-container-emerald">
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block mb-0.5">Suggested price range</span>
            <span className="listing-price-range">{data.suggestedPriceRange}</span>
          </div>
        </div>

        {/* Platform tip — distinctive card */}
        {tip && (
          <div className="listing-tip-card">
            <div className="flex items-center gap-2 mb-1.5 relative z-10">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider">{tip.platform} Tip</p>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed relative z-10">{tip.tip}</p>
          </div>
        )}
      </div>
    </div>
  );
}
