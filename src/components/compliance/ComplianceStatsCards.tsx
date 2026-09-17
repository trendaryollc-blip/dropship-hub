"use client";

import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldOff,
  TrendingUp,
} from "lucide-react";
import type { ComplianceStats } from "@/types/compliance";

interface Props {
  stats: ComplianceStats;
}

export default function ComplianceStatsCards({ stats }: Props) {
  const cards = [
    {
      label: "Total Checks",
      value: stats.totalChecks,
      icon: ShieldCheck,
      color: "text-accent",
    },
    {
      label: "Passed",
      value: stats.passedChecks,
      icon: CheckCircle2,
      color: "text-emerald-400",
    },
    {
      label: "Warnings",
      value: stats.warningChecks,
      icon: AlertTriangle,
      color: "text-amber-400",
    },
    {
      label: "Violations",
      value: stats.violationChecks,
      icon: XCircle,
      color: "text-red-400",
    },
    {
      label: "Blocked",
      value: stats.blockedProducts,
      icon: ShieldOff,
      color: "text-red-500",
    },
    {
      label: "Avg Score",
      value: stats.avgScore,
      suffix: "/100",
      icon: TrendingUp,
      color: stats.avgScore >= 70 ? "text-emerald-400" : stats.avgScore >= 40 ? "text-amber-400" : "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
            <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
          </div>
          <div className="font-display text-xl font-bold text-foreground">
            {card.value}{card.suffix || ""}
          </div>
        </div>
      ))}
    </div>
  );
}
