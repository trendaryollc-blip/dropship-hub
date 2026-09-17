"use client";

import { useMemo, useState } from "react";
import { getChartColors } from "@/lib/chart-theme";

interface RegionData {
  region: string;
  value: number;
}

interface GeographicHeatmapProps {
  data: RegionData[];
  selectedRegion?: string;
  onRegionClick?: (region: string) => void;
  height?: number;
  className?: string;
}

const REGION_POSITIONS: Record<string, { x: number; y: number; w: number; h: number }> = {
  "United States": { x: 15, y: 30, w: 20, h: 18 },
  "United Kingdom": { x: 42, y: 18, w: 8, h: 8 },
  "Canada": { x: 15, y: 10, w: 20, h: 12 },
  "Australia": { x: 70, y: 58, w: 18, h: 14 },
  "Germany": { x: 48, y: 20, w: 10, h: 10 },
  "France": { x: 42, y: 28, w: 10, h: 10 },
  "India": { x: 60, y: 32, w: 12, h: 14 },
  "Japan": { x: 82, y: 24, w: 10, h: 12 },
  "Brazil": { x: 25, y: 55, w: 16, h: 18 },
  "Mexico": { x: 10, y: 42, w: 12, h: 10 },
};

function getHeatColor(value: number, maxValue: number): string {
  const ratio = maxValue > 0 ? value / maxValue : 0;
  if (ratio > 0.8) return "#ef4444";
  if (ratio > 0.6) return "#f59e0b";
  if (ratio > 0.4) return "#22c55e";
  if (ratio > 0.2) return "#3b82f6";
  return "#6b7280";
}

export default function GeographicHeatmap({
  data,
  selectedRegion,
  onRegionClick,
  height = 280,
  className = "",
}: GeographicHeatmapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const colors = useMemo(() => getChartColors(), []);

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const valueMap = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((d) => { map[d.region] = d.value; });
    return map;
  }, [data]);

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-surface border border-border ${className}`}
        style={{ height }}
      >
        <p className="text-xs text-muted-foreground">No geographic data available</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-surface border border-border p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Geographic Distribution
        </span>
        <div className="flex items-center gap-1">
          {["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"].map((c, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
          ))}
          <span className="text-[8px] text-muted-foreground ml-1">Low → High</span>
        </div>
      </div>

      <div className="relative" style={{ height: height - 40 }}>
        <svg viewBox="0 0 100 80" className="w-full h-full">
          {/* Background */}
          <rect x="0" y="0" width="100" height="80" fill={colors.surface} rx="4" />

          {/* Region blocks */}
          {data.map((d) => {
            const pos = REGION_POSITIONS[d.region];
            if (!pos) return null;
            const color = getHeatColor(d.value, maxValue);
            const isHovered = hoveredRegion === d.region;
            const isSelected = selectedRegion === d.region;

            return (
              <g
                key={d.region}
                onClick={() => onRegionClick?.(d.region)}
                onMouseEnter={() => setHoveredRegion(d.region)}
                onMouseLeave={() => setHoveredRegion(null)}
                className="cursor-pointer"
              >
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.w}
                  height={pos.h}
                  fill={color}
                  fillOpacity={isHovered || isSelected ? 0.9 : 0.6}
                  rx="2"
                  stroke={isSelected ? colors.foreground : "transparent"}
                  strokeWidth={isSelected ? 0.5 : 0}
                />
                {pos.w > 8 && (
                  <text
                    x={pos.x + pos.w / 2}
                    y={pos.y + pos.h / 2 - 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="2.5"
                    fontWeight="bold"
                  >
                    {d.region.split(" ").map((w) => w[0]).join("")}
                  </text>
                )}
                {pos.w > 8 && (
                  <text
                    x={pos.x + pos.w / 2}
                    y={pos.y + pos.h / 2 + 2.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="2"
                    fillOpacity={0.8}
                  >
                    {d.value}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredRegion && (
          <div className="absolute top-2 right-2 rounded-lg bg-background border border-border p-2 shadow-lg pointer-events-none z-10">
            <p className="text-xs font-semibold text-foreground">{hoveredRegion}</p>
            <p className="text-[10px] text-muted-foreground">
              Interest: <span className="text-foreground font-medium">{valueMap[hoveredRegion]}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
