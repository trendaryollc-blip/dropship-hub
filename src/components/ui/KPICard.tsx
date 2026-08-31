"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  change?: string;
  up?: boolean;
  icon: LucideIcon;
  color?: string;
  prefix?: string;
  sparkline?: number[];
  className?: string;
}

function Sparkline({ data, color = "#a78bfa" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-8">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function KPICard({ label, value, change, up, icon: Icon, color = "text-accent", prefix, sparkline, className }: KPICardProps) {
  return (
    <div className={cn("glass rounded-2xl p-5 hover:border-accent/20 transition-all", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`p-1.5 rounded-lg bg-surface`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display text-2xl font-bold text-foreground">
            {prefix}{typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {change && (
            <div className="flex items-center gap-1 mt-1">
              {up !== undefined && (
                up ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span className={cn("text-[11px] font-medium", up ? "text-emerald-400" : "text-red-400")}>
                {change}
              </span>
            </div>
          )}
        </div>
        {sparkline && <Sparkline data={sparkline} />}
      </div>
    </div>
  );
}

export { Sparkline };
