"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";

interface CategoryScore {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  color: string;
}

interface HealthScoreChartProps {
  categories: CategoryScore[];
}

function PolarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function RadarChart({ categories, size = 200 }: { categories: CategoryScore[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 30;
  const levels = 5;
  const angleStep = 360 / categories.length;

  const gridPoints = useMemo(() => {
    const points: string[][] = [];
    for (let level = 1; level <= levels; level++) {
      const r = (maxRadius * level) / levels;
      const pts: string[] = [];
      for (let i = 0; i < categories.length; i++) {
        const p = PolarToCartesian(cx, cy, r, i * angleStep);
        pts.push(`${p.x},${p.y}`);
      }
      points.push(pts);
    }
    return points;
  }, [categories.length, cx, cy, maxRadius, angleStep]);

  const dataPoints = useMemo(() => {
    return categories.map((cat, i) => {
      const pct = cat.maxScore > 0 ? cat.score / cat.maxScore : 0;
      const r = maxRadius * pct;
      const p = PolarToCartesian(cx, cy, r, i * angleStep);
      return p;
    });
  }, [categories, cx, cy, maxRadius, angleStep]);

  const dataPath = useMemo(() => {
    if (dataPoints.length === 0) return "";
    return dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  }, [dataPoints]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid */}
      {gridPoints.map((pts, i) => (
        <polygon key={i} points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/50" />
      ))}

      {/* Axes */}
      {categories.map((_, i) => {
        const p = PolarToCartesian(cx, cy, maxRadius, i * angleStep);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="currentColor" strokeWidth="0.5" className="text-border/50" />;
      })}

      {/* Data area */}
      <path d={dataPath} fill="url(#radarGrad)" fillOpacity={0.2} stroke="url(#radarStroke)" strokeWidth="2" />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="currentColor" className={categories[i].color} stroke="currentColor" strokeWidth="1" />
      ))}

      {/* Labels */}
      {categories.map((cat, i) => {
        const p = PolarToCartesian(cx, cy, maxRadius + 18, i * angleStep);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[9px] font-medium">
            {cat.label.split(" ")[0]}
          </text>
        );
      })}

      <defs>
        <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function HealthScoreChart({ categories }: HealthScoreChartProps) {
  const maxTotal = categories.reduce((sum, c) => sum + c.maxScore, 0);
  const currentTotal = categories.reduce((sum, c) => sum + c.score, 0);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold text-foreground">Score Breakdown</span>
      </div>

      <RadarChart categories={categories} size={220} />

      <div className="mt-4 space-y-2">
        {categories.map((cat) => {
          const pct = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
          return (
            <div key={cat.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">{cat.label}</span>
                <span className="text-[10px] font-mono text-foreground">{cat.score}/{cat.maxScore}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cat.color.replace("text-", "bg-")}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total Score</span>
          <span className="text-xs font-bold text-foreground">{currentTotal}/{maxTotal}</span>
        </div>
      </div>
    </div>
  );
}
