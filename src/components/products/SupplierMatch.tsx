"use client";

import Link from "next/link";
import { Truck, Clock, ArrowRight, Award, MapPin, Star } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SupplierMatch } from "@/lib/mock-enrichment";

function ScoreRing({ score, size = 40 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}

const rankColors = [
  "bg-amber-400 text-black",
  "bg-slate-300 text-black",
  "bg-orange-400 text-black",
];

const badgeConfig = {
  gold: { class: "text-amber-400 bg-amber-400/10 border-amber-400/20", label: "Gold" },
  silver: { class: "text-slate-300 bg-slate-300/10 border-slate-300/20", label: "Silver" },
  bronze: { class: "text-orange-400 bg-orange-400/10 border-orange-400/20", label: "Bronze" },
};

export default function SupplierMatchSection({ suppliers, productTitle, category }: { suppliers: SupplierMatch[]; productTitle: string; category?: string }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div ref={ref} className={`intel-card transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Header */}
      <div className="p-5 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="icon-container-blue">
            <Truck className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Best Supplier Matches</h3>
            <p className="text-[10px] text-muted-foreground">Curated shortlist for this product</p>
          </div>
        </div>
        <Link href={`/suppliers?product=${encodeURIComponent(productTitle)}&category=${encodeURIComponent(category || "")}`} className="text-[10px] text-accent hover:text-accent/80 flex items-center gap-0.5 transition-colors font-medium">
          View All <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      <div className="p-5 space-y-3">
        {suppliers.map((s, i) => {
          const badge = badgeConfig[s.trustBadge] || badgeConfig.bronze;
          const cardClass = s.trustBadge === "gold" ? "supplier-gold" : s.trustBadge === "silver" ? "supplier-silver" : "supplier-bronze";

          return (
            <Link key={s.id} href={`/suppliers/${s.id}`} className={`supplier-card ${cardClass} flex items-center gap-4 p-4 ${isInView ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${i * 100}ms` }}>
              {/* Rank badge */}
              <div className={`rank-badge ${rankColors[i] || rankColors[2]}`}>{i + 1}</div>

              {/* Avatar */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400/20 to-purple-400/20 border border-border flex items-center justify-center text-base font-bold text-foreground shrink-0">
                {s.name.charAt(0)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-foreground truncate">{s.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${badge.class}`}>{s.trustBadge}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MapPin className="h-2.5 w-2.5 text-muted-foreground/60" />
                  <span className="text-[10px] text-muted-foreground">{s.flag} {s.location}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-emerald-400">${s.price.toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Truck className="h-2.5 w-2.5" /> {s.shippingToUS}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" /> {s.responseTime}
                  </span>
                </div>
              </div>

              {/* Reliability ring */}
              <div className="shrink-0 flex flex-col items-center gap-1">
                <ScoreRing score={s.reliabilityScore} size={40} />
                <span className="text-[8px] text-muted-foreground font-medium">Reliability</span>
              </div>
            </Link>
          );
        })}

        {suppliers.length === 0 && (
          <div className="text-center py-8">
            <div className="icon-container-blue mx-auto mb-3">
              <Truck className="h-5 w-5 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground">No supplier matches found yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">We&apos;re searching for the best suppliers for this product</p>
          </div>
        )}

        <Link href={`/suppliers?product=${encodeURIComponent(productTitle)}&category=${encodeURIComponent(category || "")}`} className="supplier-cta">
          <Award className="h-4 w-4 text-accent" /> Find Suppliers for This Product <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
