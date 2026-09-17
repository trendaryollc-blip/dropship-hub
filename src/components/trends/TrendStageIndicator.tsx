"use client";

import { motion } from "framer-motion";

interface TrendStageIndicatorProps {
  stage: "emerging" | "rising" | "peak" | "declining" | "dead";
  daysSinceEmergence?: number;
  estimatedDaysToNext?: number;
  className?: string;
}

const STAGES = [
  { key: "emerging", label: "Emerging", color: "#a855f7", icon: "🌱" },
  { key: "rising", label: "Rising", color: "#22c55e", icon: "📈" },
  { key: "peak", label: "Peak", color: "#f59e0b", icon: "⛰️" },
  { key: "declining", label: "Declining", color: "#ef4444", icon: "📉" },
  { key: "dead", label: "Dead", color: "#6b7280", icon: "💀" },
] as const;

export default function TrendStageIndicator({
  stage,
  daysSinceEmergence,
  estimatedDaysToNext,
  className = "",
}: TrendStageIndicatorProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === stage);
  const currentStage = STAGES[currentIndex];

  return (
    <div className={`rounded-xl bg-surface border border-border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Trend Stage</span>
        {daysSinceEmergence !== undefined && (
          <span className="text-[10px] text-muted-foreground">
            {daysSinceEmergence}d since emergence
          </span>
        )}
      </div>

      {/* Stage Bar */}
      <div className="relative h-2 rounded-full bg-background overflow-hidden mb-3">
        <div className="flex h-full">
          {STAGES.map((s, i) => (
            <div
              key={s.key}
              className="h-full flex-1"
              style={{
                backgroundColor: i <= currentIndex ? s.color : "transparent",
                opacity: i <= currentIndex ? 1 : 0.2,
              }}
            />
          ))}
        </div>
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg"
          style={{ backgroundColor: currentStage.color }}
          initial={{ left: "0%" }}
          animate={{ left: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Stage Labels */}
      <div className="flex justify-between mb-3">
        {STAGES.map((s, i) => (
          <div
            key={s.key}
            className={`flex flex-col items-center gap-1 transition-all ${
              i === currentIndex ? "opacity-100" : "opacity-40"
            }`}
          >
            <span className="text-sm">{s.icon}</span>
            <span
              className="text-[9px] font-semibold"
              style={{ color: i === currentIndex ? s.color : undefined }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Current Stage Info */}
      <div
        className="rounded-lg p-2.5 text-center"
        style={{ backgroundColor: `${currentStage.color}10` }}
      >
        <p className="text-xs font-bold" style={{ color: currentStage.color }}>
          Current Stage: {currentStage.label}
        </p>
        {estimatedDaysToNext !== undefined && estimatedDaysToNext > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            ~{estimatedDaysToNext} days to next stage
          </p>
        )}
      </div>
    </div>
  );
}
