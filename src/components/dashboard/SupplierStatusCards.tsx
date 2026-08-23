"use client";

import Link from "next/link";
import { Truck, Star, ArrowUpRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SupplierStatus } from "@/lib/mock-dashboard";

const badgeConfig = {
  gold: { color: "text-amber-400", bg: "bg-amber-400/10", glow: "shadow-amber-400/20" },
  silver: { color: "text-gray-300", bg: "bg-gray-300/10", glow: "shadow-gray-300/20" },
  bronze: { color: "text-orange-400", bg: "bg-orange-400/10", glow: "shadow-orange-400/20" },
};

const statusConfig = {
  online: { label: "Online", color: "text-emerald-400", dot: "bg-emerald-400" },
  busy: { label: "Busy", color: "text-amber-400", dot: "bg-amber-400" },
  offline: { label: "Offline", color: "text-muted-foreground", dot: "bg-muted-foreground" },
};

const responseConfig = {
  fast: { color: "text-emerald-400", dot: "bg-emerald-400" },
  moderate: { color: "text-amber-400", dot: "bg-amber-400" },
  slow: { color: "text-red-400", dot: "bg-red-400" },
};

function SupplierMiniCard({ supplier, index }: { supplier: SupplierStatus; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const badge = badgeConfig[supplier.trustBadge];
  const status = statusConfig[supplier.status];
  const response = responseConfig[supplier.responseLevel];

  return (
    <div
      ref={ref}
      className={`shrink-0 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <Link
        href="/suppliers"
        className={`block w-[200px] glass rounded-xl p-3.5 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover group`}
      >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className={`flex h-6 w-6 items-center justify-center rounded-md ${badge.bg} shadow-lg ${badge.glow}`}>
            <Star className={`h-3 w-3 ${badge.color} fill-current`} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{supplier.trustBadge}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${supplier.status === "online" ? "animate-pulse" : ""}`} />
          <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
        </div>
      </div>

      <h4 className="font-display text-xs font-semibold text-foreground truncate group-hover:text-accent transition-colors mb-1">
        {supplier.name}
      </h4>
      <p className="text-[10px] text-muted-foreground mb-2.5">{supplier.location}</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Response</span>
          <span className="flex items-center gap-1 text-[10px] font-medium">
            <span className={`w-1.5 h-1.5 rounded-full ${response.dot}`} />
            <span className={response.color}>{supplier.responseTime}</span>
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Completion</span>
            <span className="text-[10px] font-medium text-foreground">{supplier.completionRate}%</span>
          </div>
          <div className="h-1 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-1000"
              style={{ width: `${supplier.completionRate}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Rating</span>
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-400">
            <Star className="h-2.5 w-2.5 fill-current" />
            {supplier.rating}
          </span>
        </div>
      </div>
      </Link>
    </div>
  );
}

export default function SupplierStatusCards({ suppliers }: { suppliers: SupplierStatus[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-emerald-400" />
          <h3 className="font-display text-sm font-semibold text-foreground">Supplier Network</h3>
        </div>
        <Link href="/suppliers" className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {suppliers.map((supplier, i) => (
          <SupplierMiniCard key={supplier.name} supplier={supplier} index={i} />
        ))}
      </div>
    </div>
  );
}
