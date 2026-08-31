"use client";

import Link from "next/link";
import { Star, MapPin, Clock, Truck, Package, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SupplierProfile } from "@/types/supplier";
import { badgeConfig, ScoreRing, dataSourceConfig } from "./supplier-shared";

export default function SupplierListItem({ supplier, index }: { supplier: SupplierProfile; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const badge = badgeConfig[supplier.trustBadge] || badgeConfig.bronze;

  return (
    <Link href={`/suppliers/${supplier.id}`}>
      <div ref={ref} className={`glass rounded-xl border border-border p-3 sm:p-4 hover:border-accent/20 transition-all duration-500 cursor-pointer ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${index * 40}ms` }}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border flex items-center justify-center font-display text-xs sm:text-sm font-bold text-foreground shrink-0">
            {supplier.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-sm font-semibold text-foreground truncate">{supplier.name}</h3>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase shrink-0 ${badge.color} ${badge.border}`}>{badge.label}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase shrink-0 ${dataSourceConfig[supplier.dataSource].color}`}>{dataSourceConfig[supplier.dataSource].label}</span>
              <span className="hidden sm:flex items-center gap-1 text-[9px] text-emerald-400 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {supplier.flag} {supplier.location}</span>
              <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {supplier.stats.responseTimeHours > 0 ? supplier.stats.responseTime : "—"}</span>
              <span className="flex items-center gap-1"><Truck className="h-2.5 w-2.5" /> {supplier.stats.shippingDays > 0 ? `${supplier.stats.shippingDays}d` : "—"}</span>
              <span className="hidden sm:flex items-center gap-1"><Package className="h-2.5 w-2.5" /> {supplier.stats.monthlyOrders > 0 ? `${supplier.stats.monthlyOrders.toLocaleString()}/mo` : "—"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="text-xs font-bold">{supplier.stats.rating > 0 ? supplier.stats.rating.toFixed(1) : "—"}</span>
            </div>
            <ScoreRing score={supplier.stats.reliabilityScore} size={32} />
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </div>
        </div>
      </div>
    </Link>
  );
}
