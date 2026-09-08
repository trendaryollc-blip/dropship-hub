"use client";

import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  gradient?: boolean;
  positive?: boolean;
  strokeWidth?: number;
  className?: string;
}

export default function Sparkline({
  data,
  width = 80,
  height = 24,
  color,
  gradient = true,
  positive,
  strokeWidth = 1.5,
  className = "",
}: SparklineProps) {
  const resolvedColor = useMemo(() => {
    if (color) return color;
    if (positive === undefined) return "var(--accent)";
    return positive ? "var(--color-trend-up)" : "var(--color-trend-down)";
  }, [color, positive]);

  const gradientId = useMemo(
    () => `sparkline-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  const { path, areaPath, min, max } = useMemo(() => {
    if (!data.length) return { path: "", areaPath: "", min: 0, max: 0 };

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;
    const padding = 2;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const points = data.map((val, i) => ({
      x: padding + (i / (data.length - 1)) * w,
      y: padding + h - ((val - minVal) / range) * h,
    }));

    const pathParts = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];

    const area = `${pathParts.join(" ")} L ${lastPoint.x.toFixed(1)} ${height} L ${firstPoint.x.toFixed(1)} ${height} Z`;

    return {
      path: pathParts.join(" "),
      areaPath: area,
      min: minVal,
      max: maxVal,
    };
  }, [data, width, height]);

  if (!data.length || !path) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={resolvedColor} stopOpacity={0.3} />
          <stop offset="100%" stopColor={resolvedColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      {gradient && (
        <path d={areaPath} fill={`url(#${gradientId})`} />
      )}
      <path
        d={path}
        fill="none"
        stroke={resolvedColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
