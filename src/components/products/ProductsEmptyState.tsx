"use client";

import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";

export default function ProductsEmptyState({ onAskAI }: { onAskAI?: (q: string) => void }) {
  const suggestions = ["wireless earbuds", "phone accessories", "pet supplies", "kitchen gadgets", "led strip lights"];
  return (
    <div className="glass rounded-2xl p-4 sm:p-8 md:p-16 text-center">
      <Compass className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/30 mx-auto mb-4" aria-hidden="true" />
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">No products found</h3>
      <p className="text-sm text-muted-foreground mb-4">Try a different search query or enable more platforms</p>
      {onAskAI && (
        <button
          onClick={() => onAskAI("Help me find winning products for my store")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-violet-400 border border-violet-500/20 text-sm font-medium hover:border-violet-500/40 transition-all mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Smart search (filter parser)
        </button>
      )}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Try:</span>
        {suggestions.map((s) => (
          <Link
            key={s}
            href={`/products?q=${encodeURIComponent(s)}`}
            className="text-xs px-3 py-2.5 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors min-h-[36px] flex items-center"
          >
            {s}
          </Link>
        ))}
      </div>
    </div>
  );
}
