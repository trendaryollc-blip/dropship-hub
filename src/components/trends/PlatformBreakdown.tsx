"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getChartColors, chartTooltipStyle } from "@/lib/chart-theme";

interface PlatformData {
  platform: string;
  volume: number;
  growth: number;
  engagement?: number;
}

interface PlatformBreakdownProps {
  data: PlatformData[];
  metric?: "volume" | "growth" | "engagement";
  height?: number;
  className?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "#ff0050",
  instagram: "#e1306c",
  google_trends: "#4285f4",
  amazon_movers: "#ff9900",
  twitter: "#1da1f2",
  reddit: "#ff4500",
};

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "♪",
  instagram: "📷",
  google_trends: "🔍",
  amazon_movers: "📦",
  twitter: "🐦",
  reddit: "🔴",
};

export default function PlatformBreakdown({
  data,
  metric = "volume",
  height = 200,
  className = "",
}: PlatformBreakdownProps) {
  const colors = useMemo(() => getChartColors(), []);

  const chartData = useMemo(() => data.map((d) => ({
    ...d,
    label: `${PLATFORM_ICONS[d.platform] || "📊"} ${d.platform.replace("_", " ")}`,
    value: metric === "volume" ? d.volume : metric === "growth" ? d.growth : d.engagement || 0,
  })), [data, metric]);

  if (chartData.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-surface border border-border ${className}`}
        style={{ height }}
      >
        <p className="text-xs text-muted-foreground">No platform data available</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-surface border border-border p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Platform Breakdown
        </span>
        <span className="text-[10px] text-muted-foreground capitalize">
          By {metric}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: colors.muted }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10, fill: colors.muted }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            contentStyle={chartTooltipStyle.contentStyle}
            cursor={chartTooltipStyle.cursor}
            formatter={(value: number) => [
              metric === "growth" ? `${value}%` : value.toLocaleString(),
              metric.charAt(0).toUpperCase() + metric.slice(1),
            ]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
            {chartData.map((entry) => (
              <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] || colors.accent} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
