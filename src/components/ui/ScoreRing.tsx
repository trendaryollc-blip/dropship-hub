"use client";

import { useMemo } from "react";

interface ScoreRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  gradientColors?: [string, string];
  showLabel?: boolean;
  label?: string;
  className?: string;
}

function getColorFromValue(value: number, max: number): [string, string] {
  const pct = (value / max) * 100;
  if (pct >= 80) return ["var(--color-confidence-high)", "var(--success)"];
  if (pct >= 60) return ["var(--accent)", "var(--accent-warm)"];
  if (pct >= 40) return ["var(--color-confidence-medium)", "var(--warning)"];
  return ["var(--color-confidence-low)", "var(--danger)"];
}

export default function ScoreRing({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  color,
  gradientColors,
  showLabel = true,
  label,
  className = "",
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);
  const center = size / 2;

  const gradientId = useMemo(
    () => `score-ring-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  const colors = useMemo(() => {
    if (color && gradientColors) return gradientColors;
    if (color) return [color, color] as [string, string];
    return getColorFromValue(value, max);
  }, [value, max, color, gradientColors]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[10px] font-bold text-foreground">
            {label ?? Math.round(value)}
          </span>
        </div>
      )}
    </div>
  );
}
