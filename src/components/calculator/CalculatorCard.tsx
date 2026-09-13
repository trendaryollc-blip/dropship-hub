"use client";

import Link from "next/link";
import {
  DollarSign, Percent, Target, Truck, Globe, FileSearch,
  TrendingUp, RotateCcw, Package, BarChart3, ArrowRight,
} from "lucide-react";
import type { CalculatorMeta } from "@/types/calculator";

const iconMap: Record<string, typeof DollarSign> = {
  DollarSign, Percent, Target, Truck, Globe, FileSearch,
  TrendingUp, RotateCcw, Package, BarChart3,
};

interface CalculatorCardProps {
  calculator: CalculatorMeta;
}

export default function CalculatorCard({ calculator }: CalculatorCardProps) {
  const Icon = iconMap[calculator.icon] || DollarSign;

  return (
    <Link
      href={calculator.href}
      className="group glass rounded-2xl p-5 hover:border-accent/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(var(--glow-color),0.1)] flex flex-col h-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 group-hover:bg-accent/15 transition-colors">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        {calculator.isNew && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
            New
          </span>
        )}
      </div>
      <h3 className="font-display text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">
        {calculator.label}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed flex-1">
        {calculator.description}
      </p>
      <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
        Open calculator
        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
