"use client";

import { type LucideIcon } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import TrendBadge from "./TrendBadge";
import Sparkline from "./Sparkline";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number;
  sparkline?: number[];
  color?: "blue" | "emerald" | "amber" | "purple" | "rose" | "cyan";
  delay?: number;
  className?: string;
}

const colorMap = {
  blue: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  emerald: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  amber: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  purple: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  rose: "bg-rose-400/10 text-rose-400 border-rose-400/20",
  cyan: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
};

export default function MetricCard({
  icon: Icon,
  label,
  value,
  prefix = "",
  suffix = "",
  change,
  sparkline,
  color = "blue",
  delay = 0,
  className = "",
}: MetricCardProps) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const animatedValue = useAnimatedCounter(value, 800, isInView);

  return (
    <div
      ref={ref}
      className={`surface-raised rounded-2xl p-4 sm:p-5 card-glow-accent transition-all duration-700 ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        {change !== undefined && (
          <TrendBadge value={change} />
        )}
      </div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <p className="font-display text-xl font-bold text-foreground">
          {prefix}{animatedValue.toLocaleString()}{suffix}
        </p>
        {sparkline && sparkline.length > 0 && (
          <Sparkline data={sparkline} width={60} height={20} />
        )}
      </div>
    </div>
  );
}
