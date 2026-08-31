"use client";

import { useState } from "react";
import { ChevronDown, Star, Shield, ShoppingCart, Clock, RotateCcw, ExternalLink, Store } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SellerProfile } from "@/lib/mock-competitors";

const threatConfig = {
  low: { label: "Low Threat", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", ring: "bg-emerald-400" },
  medium: { label: "Medium Threat", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", ring: "bg-amber-400" },
  high: { label: "High Threat", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", ring: "bg-red-400" },
};

function TrustRing({ rating, size = 40 }: { rating: number; size?: number }) {
  const pct = (rating / 5) * 100;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="text-amber-400 -rotate-90 origin-center" style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[9px] font-bold font-display">{rating}</text>
    </svg>
  );
}

export default function CompetitorProfiles({ sellers }: { sellers: SellerProfile[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="text-lg">🏪</span> Top Competitors
        <span className="text-xs font-normal text-muted-foreground ml-1">({sellers.length} sellers)</span>
      </h3>
      <div className="space-y-3">
        {sellers.map((seller, i) => {
          const tc = threatConfig[seller.threatLevel];
          const isOpen = expanded === seller.name;
          return (
            <div
              key={seller.name}
              className={`glass rounded-xl border transition-all duration-500 ${isOpen ? "border-accent/30 shadow-lg shadow-accent/5" : "border-border hover:border-accent/15"} ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : seller.name)}
                className="w-full p-3 sm:p-4 flex items-center gap-2 sm:gap-4 text-left"
              >
                <TrustRing rating={seller.rating} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-display text-sm font-semibold text-foreground truncate">{seller.name}</h4>
                    {seller.isDropshipper && (
                      <span className="hidden sm:inline text-[9px] font-bold text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded-full border border-purple-400/20 shrink-0">DROPSHIPPER</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Store className="h-3 w-3 shrink-0" />
                    <span className="truncate">{seller.platform}</span>
                    <span className="text-border">·</span>
                    <ShoppingCart className="h-3 w-3 shrink-0" />
                    <span className="hidden sm:inline">{seller.totalProducts.toLocaleString()} products</span>
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <span className="font-display text-sm sm:text-lg font-bold text-foreground block">${seller.price.toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground">avg price</span>
                </div>
                <div className={`hidden sm:flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${tc.color} ${tc.bg} ${tc.border} shrink-0`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${tc.ring}`} />
                  {tc.label}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="px-3 sm:px-4 pb-4 border-t border-border/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mt-4 mb-4">
                    <div className="bg-surface/50 rounded-lg p-3 border border-border/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><Star className="h-3 w-3" /> Rating</div>
                      <span className="font-display text-sm font-bold text-foreground">{seller.rating}/5.0</span>
                    </div>
                    <div className="bg-surface/50 rounded-lg p-3 border border-border/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><Clock className="h-3 w-3" /> Response</div>
                      <span className="font-display text-sm font-bold text-foreground">{seller.responseTime}</span>
                    </div>
                    <div className="bg-surface/50 rounded-lg p-3 border border-border/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><RotateCcw className="h-3 w-3" /> Returns</div>
                      <span className="font-display text-sm font-bold text-foreground">{seller.returnPolicy}</span>
                    </div>
                    <div className="bg-surface/50 rounded-lg p-3 border border-border/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><Shield className="h-3 w-3" /> Trust</div>
                      <span className={`font-display text-sm font-bold ${tc.color}`}>{tc.label}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h5 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Other Products They Sell</h5>
                    <div className="flex flex-wrap gap-2">
                      {seller.otherProducts.map((p) => (
                        <div key={p.name} className="flex items-center gap-2 bg-surface/50 rounded-lg px-3 py-2 border border-border/50 text-xs max-w-full">
                          <span className="truncate">{p.name}</span>
                          <span className="text-accent font-medium shrink-0">${p.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors" disabled>
                      <ExternalLink className="h-3.5 w-3.5" /> Visit Store
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <ShoppingCart className="h-3.5 w-3.5" /> View All Products
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
