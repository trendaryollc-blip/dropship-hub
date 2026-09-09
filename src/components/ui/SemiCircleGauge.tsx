"use client";

import { useMemo } from "react";

interface SemiCircleGaugeProps {
  value: number;
  max?: number;
  width?: number;
  height?: number;
  colors?: [string, string, string];
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export default function SemiCircleGauge({
  value,
  max = 100,
  width = 100,
  height = 55,
  colors,
  showLabel = true,
  label,
  className = "",
}: SemiCircleGaugeProps) {
  const resolvedColors = colors ?? [
    "var(--color-confidence-low)",
    "var(--color-confidence-medium)",
    "var(--color-confidence-high)",
  ];

  const gradientId = useMemo(
    () => `gauge-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  const pct = Math.min(value / max, 1);
  const cx = width / 2;
  const cy = height - 5;
  const r = (Math.min(width, height * 2) - 10) / 2;

  const startAngle = Math.PI;
  const _endAngle = 0;
  const currentAngle = startAngle - pct * Math.PI;

  const needleX = cx + r * Math.cos(currentAngle);
  const needleY = cy - r * Math.sin(currentAngle);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={resolvedColors[0]} />
            <stop offset="50%" stopColor={resolvedColors[1]} />
            <stop offset="100%" stopColor={resolvedColors[2]} />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${pct * Math.PI * r} ${Math.PI * r}`}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
        <circle
          cx={needleX}
          cy={needleY}
          r="4"
          fill="var(--foreground)"
          stroke="var(--background)"
          strokeWidth="2"
          style={{ transition: "cx 0.8s cubic-bezier(0.16, 1, 0.3, 1), cy 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      {showLabel && (
        <span className="font-mono text-xs font-bold text-foreground -mt-1">
          {label ?? `${Math.round(pct * 100)}%`}
        </span>
      )}
    </div>
  );
}
