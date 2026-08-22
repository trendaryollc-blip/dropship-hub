"use client";

import { useState } from "react";
import { Copy, Check, Lightbulb, Tag, FileText, DollarSign, ShoppingBag } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { ListingSuggestion } from "@/lib/mock-enrichment";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className="shrink-0 p-1.5 rounded-md hover:bg-surface transition-colors" title="Copy to clipboard">
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}

export default function ListingOptimization({ data, platform }: { data: ListingSuggestion; platform?: string }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const tip = data.platformTips.find((t) => t.platform.toLowerCase().includes(platform?.toLowerCase() || "")) || data.platformTips[0];

  return (
    <div ref={ref} className={`glass rounded-2xl border border-border overflow-hidden transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-400/10 flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Listing Optimization</h3>
            <p className="text-[10px] text-muted-foreground">AI-powered suggestions for your store</p>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {/* Suggested title */}
        <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="h-3 w-3 text-accent" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggested Title</span>
            </div>
            <CopyBtn text={data.title} />
          </div>
          <p className="text-sm text-foreground font-medium">{data.title}</p>
        </div>
        {/* Description */}
        <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-accent" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</span>
            </div>
            <CopyBtn text={data.description} />
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{data.description}</p>
        </div>
        {/* Tags */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="h-3 w-3 text-accent" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Suggested Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((t) => (
              <span key={t} className="text-[10px] px-2 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent">{t}</span>
            ))}
          </div>
        </div>
        {/* Price range */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-400/5 border border-emerald-400/10">
          <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
          <div>
            <span className="text-[10px] text-muted-foreground">Suggested price range: </span>
            <span className="text-sm font-bold text-emerald-400">{data.suggestedPriceRange}</span>
          </div>
        </div>
        {/* Platform tip */}
        {tip && (
          <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
            <p className="text-[10px] font-semibold text-accent mb-1">{tip.platform} Tip</p>
            <p className="text-xs text-foreground/80">{tip.tip}</p>
          </div>
        )}
      </div>
    </div>
  );
}
