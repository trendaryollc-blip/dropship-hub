"use client";

import { Shield } from "lucide-react";
import type { MonitoringHealth } from "@/lib/monitoring/types";

interface HealthRecommendationsProps {
  health: MonitoringHealth;
}

export default function HealthRecommendations({ health }: HealthRecommendationsProps) {
  if (health.recommendations.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4 border-l-4 border-amber-400">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-semibold text-foreground">Health Recommendations</span>
      </div>
      <ul className="space-y-1">
        {health.recommendations.map((rec, i) => (
          <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">-</span>
            {rec}
          </li>
        ))}
      </ul>
    </div>
  );
}
