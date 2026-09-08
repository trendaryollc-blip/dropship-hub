"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from "recharts";
import { getChartColors, chartTooltipStyle } from "@/lib/chart-theme";

interface DashboardSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  positive?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export default function DashboardSparkline({
  data,
  width = 80,
  height = 24,
  color,
  positive,
  showTooltip = false,
  className = "",
}: DashboardSparklineProps) {
  const colors = useMemo(() => getChartColors(), []);

  const resolvedColor = useMemo(() => {
    if (color) return color;
    if (positive === undefined) return colors.accent;
    return positive ? colors.success : colors.danger;
  }, [color, positive, colors]);

  const chartData = useMemo(
    () => data.map((value, index) => ({ index, value })),
    [data]
  );

  if (!data.length) return null;

  const lastPoint = data[data.length - 1];

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <defs>
            <linearGradient id={`sparkline-${resolvedColor.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={resolvedColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={resolvedColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showTooltip && (
            <Tooltip
              {...chartTooltipStyle}
              formatter={(value: number) => [value.toLocaleString(), ""]}
              contentStyle={{ ...chartTooltipStyle.contentStyle, fontSize: "10px", padding: "4px 8px" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={resolvedColor}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 2, fill: resolvedColor }}
          />
          <ReferenceDot
            x={data.length - 1}
            y={lastPoint}
            r={3}
            fill={resolvedColor}
            stroke="var(--background, #0c0c0c)"
            strokeWidth={1.5}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
