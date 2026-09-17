"use client";

import Link from "next/link";
import {
  Truck, Users, Star, ArrowUpRight,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { SectionDivider } from "./SectionDivider";
import type { SupplierStatus } from "@/types/dashboard";

export function SupplierNetwork({ suppliers }: { suppliers: SupplierStatus[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const online = suppliers.filter(s => s.status === "online").length;
  const busy = suppliers.filter(s => s.status === "busy").length;
  const offline = suppliers.filter(s => s.status === "offline").length;
  const badgeColors: Record<string, { bg: string; text: string }> = {
    gold: { bg: "bg-amber-400/10", text: "text-amber-400" },
    silver: { bg: "bg-gray-300/10", text: "text-gray-300" },
    bronze: { bg: "bg-orange-400/10", text: "text-orange-400" },
  };
  const statusColors: Record<string, string> = { online: "bg-emerald-400", busy: "bg-amber-400", offline: "bg-gray-500" };
  const responseColors: Record<string, string> = { fast: "text-emerald-400", moderate: "text-amber-400", slow: "text-red-400" };

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Supplier Network" icon={Truck} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {/* Supplier Stats */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Network Status</span>
          </div>
          <div className="text-center mb-4">
            <p className="font-display text-3xl font-bold text-white">{suppliers.length}</p>
            <p className="text-[10px] text-gray-500 uppercase">Total Suppliers</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
              <p className="font-display text-lg font-bold text-emerald-400">{online}</p>
              <p className="text-[8px] text-emerald-400/70 uppercase">Online</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/15">
              <p className="font-display text-lg font-bold text-amber-400">{busy}</p>
              <p className="text-[8px] text-amber-400/70 uppercase">Busy</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-500/10 border border-gray-500/15">
              <p className="font-display text-lg font-bold text-gray-400">{offline}</p>
              <p className="text-[8px] text-gray-400/70 uppercase">Offline</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Link href="/suppliers" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold hover:bg-blue-500/20 transition-all">
              All Suppliers
            </Link>
            <Link href="/srm" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-semibold hover:bg-purple-500/20 transition-all">
              SRM
            </Link>
          </div>
        </div>

        {/* Supplier Cards */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white">Top Suppliers</span>
            <Link href="/supplier-performance" className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              Performance <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {suppliers.length === 0 && (
              <p className="text-[11px] text-gray-600 text-center py-4">No suppliers connected</p>
            )}
            {suppliers.slice(0, 4).map((s) => {
              const badge = badgeColors[s.trustBadge] || badgeColors.bronze;
              return (
                <Link key={s.name} href="/suppliers" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-all group">
                  <div className={`p-2 rounded-lg ${badge.bg}`}>
                    <Star className={`h-4 w-4 ${badge.text} fill-current`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">{s.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColors[s.status]} ${s.status === "online" ? "animate-pulse" : ""}`} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-gray-500">{s.location}</span>
                      <span className="text-[9px] text-gray-600">&middot;</span>
                      <span className={`text-[9px] ${responseColors[s.responseLevel] || "text-gray-500"}`}>{s.responseTime}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-amber-400">
                      <Star className="h-2.5 w-2.5 fill-current" />{s.rating}
                    </div>
                    <span className="text-[9px] text-gray-600">{s.completionRate}% complete</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
