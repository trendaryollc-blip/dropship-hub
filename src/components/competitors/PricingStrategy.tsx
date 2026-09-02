"use client";

import { Check, Sparkles } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { PricingOption } from "@/types/competitors";

const colorMap: Record<string, { border: string; bg: string; ring: string; btn: string; glow: string }> = {
  blue: { border: "border-blue-400/30", bg: "bg-blue-400/5", ring: "from-blue-400 to-blue-600", btn: "bg-blue-500 hover:bg-blue-600", glow: "shadow-blue-400/10" },
  emerald: { border: "border-emerald-400/40", bg: "bg-emerald-400/5", ring: "from-emerald-400 to-emerald-600", btn: "bg-emerald-500 hover:bg-emerald-600", glow: "shadow-emerald-400/20" },
  purple: { border: "border-purple-400/30", bg: "bg-purple-400/5", ring: "from-purple-400 to-purple-600", btn: "bg-purple-500 hover:bg-purple-600", glow: "shadow-purple-400/10" },
};

export default function PricingStrategy({ options }: { options: PricingOption[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="text-lg">💰</span> Pricing Strategy
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((opt, i) => {
          const c = colorMap[opt.color];
          return (
            <div
              key={opt.label}
              className={`relative glass rounded-2xl p-4 sm:p-6 border transition-all duration-500 hover:scale-[1.02] cursor-pointer group overflow-hidden ${
                opt.isRecommended ? `${c.border} shadow-lg ${c.glow}` : "border-border hover:border-accent/20"
              } ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              {opt.isRecommended && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
              )}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl opacity-5 rounded-bl-full" style={{ backgroundImage: `linear-gradient(to bottom left, var(--tw-gradient-stops))` }} />

              <div className="relative">
                {opt.isRecommended && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 w-fit mb-3">
                    <Sparkles className="h-3 w-3" />
                    SWEET SPOT
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="font-display text-lg font-bold text-foreground">{opt.label}</span>
                </div>

                <div className="mb-4">
                  <span className="font-display text-2xl sm:text-3xl font-bold text-foreground">${opt.price.toFixed(2)}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-medium ${opt.isRecommended ? "text-emerald-400" : "text-muted-foreground"}`}>
                      {opt.margin}% margin
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-2">{opt.description}</p>
                <p className="text-xs text-muted-foreground/70 mb-5">{opt.tradeoff}</p>

                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`$${opt.price.toFixed(2)}`); const btn = e.currentTarget as HTMLButtonElement; const original = btn.textContent; btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = original; }, 1500); }} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all active:scale-95 ${opt.isRecommended ? c.btn : "bg-surface hover:bg-surface/80 text-foreground border border-border"}`}>
                  <Check className="h-4 w-4" />
                  Use This Price
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
