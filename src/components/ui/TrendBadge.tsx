"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendBadgeProps {
  value: number;
  suffix?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export default function TrendBadge({
  value,
  suffix = "%",
  size = "sm",
  showIcon = true,
  className = "",
}: TrendBadgeProps) {
  const isUp = value > 0;
  const isDown = value < 0;
  const isNeutral = value === 0;

  const sizeClasses = {
    sm: "text-[10px] gap-0.5",
    md: "text-xs gap-1",
    lg: "text-sm gap-1.5",
  };

  const iconSize = { sm: 10, md: 12, lg: 14 };

  const colorClass = isUp
    ? "text-[var(--color-trend-up)]"
    : isDown
    ? "text-[var(--color-trend-down)]"
    : "text-[var(--color-trend-neutral)]";

  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <span className={`inline-flex items-center font-mono font-medium ${sizeClasses[size]} ${colorClass} ${className}`}>
      {showIcon && <Icon size={iconSize[size]} />}
      <span>
        {isUp ? "+" : ""}
        {value.toFixed(1)}
        {suffix}
      </span>
    </span>
  );
}
