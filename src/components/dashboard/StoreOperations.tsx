"use client";

import Link from "next/link";
import {
  Store, Layers, Activity, HeartPulse,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { SectionDivider } from "./SectionDivider";

export function StoreOperations({ storesConnected }: { storesConnected: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const ops = [
    { icon: Store, label: "My Stores", desc: `${storesConnected} connected. Sync inventory, push products.`, href: "/store", color: "from-blue-500/10 to-blue-600/5 border-blue-500/15", iconColor: "text-blue-400" },
    { icon: Layers, label: "Multi-Store", desc: "Manage multiple stores, cross-sync, bulk ops.", href: "/multi-store", color: "from-purple-500/10 to-purple-600/5 border-purple-500/15", iconColor: "text-purple-400" },
    { icon: Activity, label: "Monitoring", desc: "Real-time uptime, performance tracking.", href: "/monitoring", color: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/15", iconColor: "text-emerald-400" },
    { icon: HeartPulse, label: "Store Health", desc: "Health scores, alerts, recommendations.", href: "/health", color: "from-rose-500/10 to-rose-600/5 border-rose-500/15", iconColor: "text-rose-400" },
  ];
  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Store Operations" icon={Store} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {ops.map((op) => (
          <Link key={op.href} href={op.href} aria-label={`Open ${op.label}`}
            className={`group p-5 rounded-2xl bg-gradient-to-br ${op.color} border hover:scale-[1.02] transition-all duration-500 hover:shadow-lg`}>
            <div className={`p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] inline-flex mb-3 ${op.iconColor} group-hover:scale-110 transition-transform`}>
              <op.icon className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{op.label}</h3>
            <p className="text-[10px] text-gray-400 leading-relaxed">{op.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
