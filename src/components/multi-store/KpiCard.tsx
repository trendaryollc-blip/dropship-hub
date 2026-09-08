"use client";

import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  delay: number;
}

export default function KpiCard({ label, value, trend, icon, delay }: KpiCardProps) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const numericValue = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) || 0 : value;
  const counter = useAnimatedCounter(numericValue, 1500, isInView);
  const prefix = typeof value === "string" && value.startsWith("$") ? "$" : "";
  const suffix = typeof value === "string" && value.includes("%") ? "%" : "";
  return (
    <div ref={ref} className={`glass rounded-xl p-4 transition-all duration-500 hover:border-accent/20 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">{icon}</div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="font-display text-lg font-bold text-foreground">{prefix}{Math.round(counter).toLocaleString()}{suffix}</p>
    </div>
  );
}
