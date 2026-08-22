"use client";

import Link from "next/link";
import { Truck, Clock, ArrowRight, Award, MapPin } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SupplierMatch } from "@/lib/mock-enrichment";

const badgeColors = { gold: "text-amber-400 bg-amber-400/10 border-amber-400/20", silver: "text-slate-300 bg-slate-300/10 border-slate-300/20", bronze: "text-orange-400 bg-orange-400/10 border-orange-400/20" };

function ScoreRing({ score, size = 32 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[8px] font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}

export default function SupplierMatchSection({ suppliers, productTitle, category }: { suppliers: SupplierMatch[]; productTitle: string; category?: string }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div ref={ref} className={`glass rounded-2xl border border-border overflow-hidden transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <Truck className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">Best Supplier Matches</h3>
              <p className="text-[10px] text-muted-foreground">Top 3 suppliers for this product</p>
            </div>
          </div>
          <Link href={`/suppliers?product=${encodeURIComponent(productTitle)}&category=${encodeURIComponent(category || "")}`} className="text-[10px] text-accent hover:text-accent/80 flex items-center gap-0.5 transition-colors">
            View All <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {suppliers.map((s, i) => (
          <Link key={s.id} href={`/suppliers/${s.id}`} className={`flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border/50 hover:border-accent/20 transition-all ${isInView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${i * 100}ms` }}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400/20 to-purple-400/20 border border-border flex items-center justify-center text-sm font-bold text-foreground shrink-0">{s.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${badgeColors[s.trustBadge]}`}>{s.trustBadge}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{s.flag} {s.location}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-bold text-emerald-400">${s.price.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Truck className="h-2.5 w-2.5" />{s.shippingToUS}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{s.responseTime}</span>
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-1">
              <ScoreRing score={s.reliabilityScore} size={32} />
              <span className="text-[8px] text-muted-foreground">Reliability</span>
            </div>
          </Link>
        ))}
        <Link href={`/suppliers?product=${encodeURIComponent(productTitle)}&category=${encodeURIComponent(category || "")}`} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20 text-sm font-semibold text-foreground hover:from-blue-500/20 hover:to-purple-500/20 transition-all">
          <Award className="h-4 w-4 text-accent" /> Find Suppliers for This Product <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
