"use client";

import { useMemo } from "react";

interface BusinessHealthRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

function getScoreColor(score: number): { stroke: string; glow: string; text: string } {
  if (score >= 80) return { stroke: "#22c55e", glow: "drop-shadow(0 0 6px rgba(34,197,94,0.4))", text: "text-emerald-400" };
  if (score >= 60) return { stroke: "#3b82f6", glow: "drop-shadow(0 0 6px rgba(59,130,246,0.4))", text: "text-blue-400" };
  if (score >= 40) return { stroke: "#f59e0b", glow: "drop-shadow(0 0 6px rgba(245,158,11,0.4))", text: "text-amber-400" };
  return { stroke: "#ef4444", glow: "drop-shadow(0 0 6px rgba(239,68,68,0.4))", text: "text-red-400" };
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

export default function BusinessHealthRing({
  score,
  size = 120,
  strokeWidth = 8,
  showLabel = true,
  className = "",
}: BusinessHealthRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const { stroke, glow, text } = useMemo(() => getScoreColor(score), [score]);
  const label = useMemo(() => getScoreLabel(score), [score]);

  // Scale text size based on ring size
  const scoreFontSize = size <= 40 ? 10 : size <= 60 ? 14 : size <= 80 ? 18 : 24;
  const unitFontSize = size <= 40 ? 6 : size <= 60 ? 8 : 9;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Score ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: glow, transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${text}`} style={{ fontSize: scoreFontSize }}>{score}</span>
          <span className="text-muted-foreground uppercase tracking-wider" style={{ fontSize: unitFontSize }}>/100</span>
        </div>
      </div>
      {showLabel && (
        <div className="text-center">
          <p className={`text-xs font-semibold ${text}`}>{label}</p>
        </div>
      )}
    </div>
  );
}
