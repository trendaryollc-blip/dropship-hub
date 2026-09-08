"use client";

import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import type { SupplierDueDiligence } from "@/types/supplier";

const riskConfig = {
  low: { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Low Risk" },
  medium: { icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Med Risk" },
  high: { icon: ShieldAlert, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", label: "High Risk" },
  critical: { icon: ShieldX, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Critical" },
};

export default function DueDiligenceBadge({ report }: { report: SupplierDueDiligence }) {
  const config = riskConfig[report.riskLevel];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${config.bg} ${config.border} ${config.color}`}>
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  );
}
