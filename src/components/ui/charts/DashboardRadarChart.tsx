"use client";

import { useMemo } from "react";
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getChartColors, chartTooltipStyle } from "@/lib/chart-theme";

interface RadarDataPoint {
  axis: string;
  value: number;
}

interface DashboardRadarChartProps {
  data: RadarDataPoint[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  maxValue?: number;
  className?: string;
}

export default function DashboardRadarChart({
  data,
  color,
  height = 200,
  showGrid = true,
  showTooltip = true,
  maxValue = 100,
  className = "",
}: DashboardRadarChartProps) {
  const colors = useMemo(() => getChartColors(), []);
  const strokeColor = color || colors.accent;

  if (!data.length) {
    return (
      <div className={`flex items-center justify-center h-[${height}px] text-muted-foreground text-sm ${className}`}>
        No data available
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          {showGrid && <PolarGrid stroke={colors.border} />}
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: colors.muted, fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, maxValue]}
            tick={{ fill: colors.muted, fontSize: 9 }}
            axisLine={false}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke={strokeColor}
            fill={strokeColor}
            fillOpacity={0.2}
            strokeWidth={2}
          />
          {showTooltip && (
            <Tooltip
              {...chartTooltipStyle}
              formatter={(value: number) => [`${value}%`, "Score"]}
            />
          )}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
