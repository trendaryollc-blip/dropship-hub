"use client";

import { useMemo } from "react";
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getChartColors, chartTooltipStyle } from "@/lib/chart-theme";

interface DataPoint {
  date: string;
  value: number;
  predicted?: number;
}

interface DashboardAreaChartProps {
  data: DataPoint[];
  predicted?: DataPoint[];
  color?: string;
  gradientId?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showAxis?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  className?: string;
}

export default function DashboardAreaChart({
  data,
  predicted = [],
  color,
  gradientId = "areaGradient",
  height = 200,
  showGrid = true,
  showTooltip = true,
  showAxis = true,
  valuePrefix = "",
  valueSuffix = "",
  className = "",
}: DashboardAreaChartProps) {
  const colors = useMemo(() => getChartColors(), []);
  const strokeColor = color || colors.accent;

  const chartData = useMemo(() => {
    const map = new Map<string, DataPoint>();
    data.forEach((d) => map.set(d.date, d));
    predicted.forEach((d) => map.set(d.date, { ...d, predicted: d.value }));
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data, predicted]);

  const hasPredicted = predicted.length > 0;

  if (!chartData.length) {
    return (
      <div className={`flex items-center justify-center h-[${height}px] text-muted-foreground text-sm ${className}`}>
        No data available
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsAreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
            {hasPredicted && (
              <linearGradient id={`${gradientId}-predicted`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.muted} stopOpacity={0.15} />
                <stop offset="100%" stopColor={colors.muted} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
          )}
          {showAxis && (
            <>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.muted, fontSize: 11 }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.muted, fontSize: 11 }}
                tickFormatter={(val) => `${valuePrefix}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}${valueSuffix}`}
              />
            </>
          )}
          {showTooltip && (
            <Tooltip
              {...chartTooltipStyle}
              labelFormatter={(val) => new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              formatter={(value: number, name: string) => [
                `${valuePrefix}${value.toLocaleString()}${valueSuffix}`,
                name === "predicted" ? "Predicted" : "Actual",
              ]}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: strokeColor, stroke: colors.surface, strokeWidth: 2 }}
          />
          {hasPredicted && (
            <Area
              type="monotone"
              dataKey="predicted"
              stroke={colors.muted}
              strokeWidth={2}
              strokeDasharray="6 4"
              fill={`url(#${gradientId}-predicted)`}
              dot={false}
              activeDot={{ r: 3, fill: colors.muted, stroke: colors.surface, strokeWidth: 2 }}
            />
          )}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
