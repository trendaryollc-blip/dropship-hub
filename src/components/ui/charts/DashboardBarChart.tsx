"use client";

import { useMemo } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getChartColors, chartTooltipStyle } from "@/lib/chart-theme";

interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface DashboardBarChartProps {
  data: BarDataPoint[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showAxis?: boolean;
  layout?: "vertical" | "horizontal";
  className?: string;
}

export default function DashboardBarChart({
  data,
  color,
  height = 150,
  showGrid = true,
  showTooltip = true,
  showAxis = true,
  layout = "horizontal",
  className = "",
}: DashboardBarChartProps) {
  const colors = useMemo(() => getChartColors(), []);
  const barColor = color || colors.accent;

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
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />}
          {showAxis && (
            <>
              <XAxis
                type={layout === "horizontal" ? "category" : "number"}
                dataKey={layout === "horizontal" ? "label" : "value"}
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.muted, fontSize: 10 }}
              />
              <YAxis
                type={layout === "horizontal" ? "number" : "category"}
                dataKey={layout === "horizontal" ? "value" : "label"}
                axisLine={false}
                tickLine={false}
                tick={{ fill: colors.muted, fontSize: 10 }}
              />
            </>
          )}
          {showTooltip && (
            <Tooltip
              {...chartTooltipStyle}
              formatter={(value: number) => [value.toLocaleString(), ""]}
            />
          )}
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color || barColor} fillOpacity={0.8} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
