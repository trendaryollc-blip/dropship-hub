"use client";

import { useMemo } from "react";
import { Radar, Loader2 } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI } from "@/hooks/useAPI";
import type { RadarComparison, RadarComparisonSupplier } from "@/types/supplier";

const DIMENSIONS = ["price", "speed", "quality", "reliability", "communication"] as const;
const DIMENSION_LABELS: Record<string, string> = {
  price: "Price",
  speed: "Speed",
  quality: "Quality",
  reliability: "Reliability",
  communication: "Communication",
};

function SpiderChart({ suppliers, size = 240 }: { suppliers: RadarComparisonSupplier[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 40) / 2;
  const angles = DIMENSIONS.map((_, i) => (Math.PI * 2 * i) / DIMENSIONS.length - Math.PI / 2);

  const getPoint = (angle: number, value: number) => ({
    x: cx + (value / 100) * r * Math.cos(angle),
    y: cy + (value / 100) * r * Math.sin(angle),
  });

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px] mx-auto">
      {gridLevels.map((level) => {
        const points = angles.map((a) => {
          const p = getPoint(a, level);
          return `${p.x},${p.y}`;
        }).join(" ");
        return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />;
      })}

      {angles.map((angle, i) => {
        const end = getPoint(angle, 100);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />;
      })}

      {DIMENSIONS.map((dim, i) => {
        const labelPoint = getPoint(angles[i], 115);
        return (
          <text key={dim} x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle"
            className="text-[7px] fill-muted-foreground">
            {DIMENSION_LABELS[dim]}
          </text>
        );
      })}

      {suppliers.map((supplier, si) => {
        const points = DIMENSIONS.map((dim, i) => {
          const p = getPoint(angles[i], supplier.scores[dim]);
          return `${p.x},${p.y}`;
        }).join(" ");
        return (
          <g key={supplier.supplierId}>
            <polygon points={points} fill={supplier.color} fillOpacity="0.1" stroke={supplier.color} strokeWidth="1.5" />
            {DIMENSIONS.map((dim, i) => {
              const p = getPoint(angles[i], supplier.scores[dim]);
              return <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={supplier.color} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

export default function RadarComparisonChart({ supplierIds }: { supplierIds?: string }) {
  const { ref, isInView } = useInView();
  const ids = supplierIds || "";

  const { data, isLoading } = useAPI<{ comparison: RadarComparison }>(
    isInView && ids ? `/api/suppliers/radar-compare?ids=${ids}` : null
  );

  const comparison = data?.comparison;
  const suppliers = comparison?.suppliers || [];
  const insights = comparison?.insights || [];

  return (
    <div ref={ref} className="glass rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <Radar className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Radar Comparison</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-8">
          <Radar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Select suppliers to compare using radar chart</p>
        </div>
      ) : (
        <>
          <SpiderChart suppliers={suppliers} />

          <div className="flex items-center justify-center gap-3 mt-3">
            {suppliers.map((s) => (
              <div key={s.supplierId} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[9px] text-muted-foreground">{s.supplierName}</span>
              </div>
            ))}
          </div>

          {insights.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-[9px] text-muted-foreground font-medium">Insights</p>
              {insights.map((insight, i) => (
                <p key={i} className="text-[10px] text-foreground">• {insight}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
