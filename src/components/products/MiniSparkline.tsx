"use client";

import { useState, useEffect } from "react";

interface MiniSparklineProps {
  points: number[];
  color?: string;
  id?: string;
  width?: number;
  height?: number;
}

export default function MiniSparkline({ points, color = "#3b82f6", id = "spark", width, height }: MiniSparklineProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="shrink-0" style={{ width: width || 120, height: height || 32 }} />;

  const w = width || 120;
  const h = height || 32;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (points.length - 1)) * w} ${h - ((p - min) / range) * h}`).join(" ");

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`ms-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${pathD} L ${w} ${h} L 0 ${h} Z`} fill={`url(#ms-${id})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
