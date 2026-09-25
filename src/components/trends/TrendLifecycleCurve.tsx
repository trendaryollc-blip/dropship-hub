"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { getChartColors, chartTooltipStyle } from "@/lib/chart-theme";

interface DataPoint {
  date: string;
  value: number;
  predicted?: boolean;
}

interface TrendLifecycleCurveProps {
  actualData: DataPoint[];
  predictedData?: DataPoint[];
  currentStage?: "emerging" | "rising" | "peak" | "declining" | "dead";
  predictedPeakDate?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  className?: string;
  emptyNote?: string;
  forecastNote?: string;
}

const STAGE_COLORS: Record<string, string> = {
  emerging: "#a855f7",
  rising: "#22c55e",
  peak: "#f59e0b",
  declining: "#ef4444",
  dead: "#6b7280",
};

export default function TrendLifecycleCurve({
  actualData,
  predictedData = [],
  currentStage = "rising",
  predictedPeakDate,
  height = 250,
  showGrid = true,
  showTooltip = true,
  className = "",
  emptyNote = "No trend data available",
  forecastNote,
}: TrendLifecycleCurveProps) {
  const colors = useMemo(() => getChartColors(), []);

  const chartData = useMemo(() => {
    const actual = actualData.map((d) => ({ ...d, predicted: false }));
    const predicted = predictedData.map((d) => ({ ...d, predicted: true }));
    return [...actual, ...predicted];
  }, [actualData, predictedData]);

  const peakPoint = useMemo(() => {
    if (predictedPeakDate && chartData.length > 0) {
      return chartData.find((d) => d.date === predictedPeakDate) || null;
    }
    return null;
  }, [chartData, predictedPeakDate]);

  const stageColor = STAGE_COLORS[currentStage] || colors.accent;

  const showForecastNote = Boolean(forecastNote) && predictedData.length === 0;

  const gradientId = useMemo(() => `lifecycle-${Math.random().toString(36).slice(2, 9)}`, []);

  if (chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-surface border border-border ${className}`} style={{ height }}>
        <p className="text-xs text-muted-foreground px-4 text-center">{emptyNote}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-surface border border-border p-3 ${className}`} role="img" aria-label="Trend lifecycle curve">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={`${gradientId}-actual`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stageColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={stageColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${gradientId}-predicted`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.muted} stopOpacity={0.2} />
              <stop offset="95%" stopColor={colors.muted} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
          )}
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: colors.muted }}
            tickFormatter={(val: string) => {
              const d = new Date(val);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: colors.muted }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val: number) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val))}
          />
          {showTooltip && (
            <Tooltip
              contentStyle={chartTooltipStyle.contentStyle}
              cursor={chartTooltipStyle.cursor}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name === "predicted" ? "Predicted" : "Actual",
              ]}
              labelFormatter={(label: string) => {
                const d = new Date(label);
                return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={stageColor}
            strokeWidth={2}
            fill={`url(#${gradientId}-actual)`}
            dot={false}
            activeDot={{ r: 4, fill: stageColor, stroke: colors.surface, strokeWidth: 2 }}
          />
          {predictedData.length > 0 && (
            <Area
              type="monotone"
              dataKey="value"
              stroke={colors.muted}
              strokeWidth={2}
              strokeDasharray="6 3"
              fill={`url(#${gradientId}-predicted)`}
              dot={false}
            />
          )}
          {peakPoint && (
            <ReferenceDot
              x={peakPoint.date}
              y={peakPoint.value}
              r={6}
              fill={STAGE_COLORS.peak}
              stroke={colors.surface}
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
      {showForecastNote && (
        <p className="text-[10px] text-muted-foreground text-center mt-1">{forecastNote}</p>
      )}
    </div>
  );
}
