"use client";

import { Award, TrendingUp, TrendingDown, Minus, Clock, Star, MessageSquare, DollarSign, Shield } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI } from "@/hooks/useAPI";
import type { SupplierScorecard, ScorecardCriteria } from "@/types/srm";

function RadarChart({ criteria, size = 200 }: { criteria: ScorecardCriteria; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 20;
  const labels = ["Speed", "Quality", "Communication", "Price", "Reliability"];
  const keys: (keyof ScorecardCriteria)[] = ["speed", "quality", "communication", "price", "reliability"];
  const colors = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#ec4899"];
  const angles = keys.map((_, i) => (Math.PI * 2 * i) / keys.length - Math.PI / 2);

  const getPoint = (value: number, angle: number) => {
    const r = (value / 100) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {gridLevels.map((level) => {
        const points = angles.map((a) => getPoint(level, a)).map((p) => `${p.x},${p.y}`).join(" ");
        return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />;
      })}
      {/* Axis lines */}
      {angles.map((a, i) => {
        const end = getPoint(100, a);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />;
      })}
      {/* Data polygon */}
      <polygon
        points={keys.map((k, i) => {
          const p = getPoint(criteria[k].score, angles[i]);
          return `${p.x},${p.y}`;
        }).join(" ")}
        fill="rgba(168,85,247,0.15)"
        stroke="#a855f7"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Data points + labels */}
      {keys.map((k, i) => {
        const p = getPoint(criteria[k].score, angles[i]);
        const labelR = maxR + 16;
        const lp = { x: cx + labelR * Math.cos(angles[i]), y: cy + labelR * Math.sin(angles[i]) };
        return (
          <g key={k}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={colors[i]} stroke="white" strokeWidth="1" />
            <text
              x={lp.x}
              y={lp.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-[9px] fill-neutral-400 font-medium"
            >
              {labels[i]}
            </text>
            <text
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              className="text-[8px] fill-white font-bold"
            >
              {criteria[k].score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function GradeDisplay({ grade, score, trend }: { grade: string; score: number; trend: "improving" | "stable" | "declining" }) {
  const gradeColors: Record<string, string> = {
    "A+": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    A: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    "A-": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    "B+": "text-blue-400 bg-blue-400/10 border-blue-400/20",
    B: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "B-": "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "C+": "text-amber-400 bg-amber-400/10 border-amber-400/20",
    C: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    "C-": "text-amber-400 bg-amber-400/10 border-amber-400/20",
    D: "text-red-400 bg-red-400/10 border-red-400/20",
    F: "text-red-400 bg-red-400/10 border-red-400/20",
  };

  const trendConfig = {
    improving: { icon: TrendingUp, color: "text-emerald-400", label: "Improving" },
    stable: { icon: Minus, color: "text-neutral-500", label: "Stable" },
    declining: { icon: TrendingDown, color: "text-red-400", label: "Declining" },
  };

  const t = trendConfig[trend];

  return (
    <div className="flex items-center gap-4">
      <div className={`text-4xl font-display font-black px-4 py-2 rounded-2xl border ${gradeColors[grade] || "text-neutral-400 bg-neutral-400/10 border-neutral-400/20"}`}>
        {grade}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-white">{score.toFixed(1)}<span className="text-sm text-neutral-500">/100</span></p>
        <div className="flex items-center gap-1.5">
          <t.icon className={`h-3.5 w-3.5 ${t.color}`} />
          <span className={`text-xs font-medium ${t.color}`}>{t.label}</span>
        </div>
      </div>
    </div>
  );
}

function ScorecardHistory({ history }: { history: SupplierScorecard["history"] }) {
  if (!history || history.length < 2) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-xs text-neutral-400">Score history will appear after multiple evaluations.</p>
      </div>
    );
  }

  const values = history.map((h) => h.overallScore);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const chartW = 300;
  const chartH = 50;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * chartW;
    const y = chartH - ((v - min) / range) * (chartH - 8) - 4;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${chartW} ${chartH} L 0 ${chartH} Z`;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-3">Score History</p>
      <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="scoreHistoryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#scoreHistoryGrad)" />
        <path d={linePath} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
        <circle cx={points[0].x} cy={points[0].y} r="3" fill="#a855f7" />
      </svg>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[9px] text-neutral-500">{history[history.length - 1]?.date}</span>
        <span className="text-[9px] text-neutral-500">{history[0]?.date}</span>
      </div>
    </div>
  );
}

export default function SupplierScorecardTab({ supplierId, supplierName }: { supplierId: string; supplierName: string }) {
  const { data, isLoading } = useAPI<{ scorecards?: SupplierScorecard[] }>(
    "/api/srm/scorecards"
  );
  const scorecard = data?.scorecards?.find((s) => s.supplierId === supplierId);
  const { ref, isInView } = useInView({ threshold: 0.05 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse">
          <div className="h-6 w-32 bg-white/5 rounded mb-4" />
          <div className="h-[200px] bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (!scorecard) {
    return (
      <div ref={ref} className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center transition-all duration-500 ${isInView ? "opacity-100" : "opacity-0"}`}>
        <Award className="h-10 w-10 text-neutral-700 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-white mb-1">No Scorecard Yet</h4>
        <p className="text-xs text-neutral-400 max-w-xs mx-auto">
          A performance scorecard for {supplierName} will be created once you have enough interaction data.
        </p>
      </div>
    );
  }

  const criteriaConfig = [
    { key: "speed" as const, label: "Speed", icon: Clock, color: "#3b82f6" },
    { key: "quality" as const, label: "Quality", icon: Star, color: "#22c55e" },
    { key: "communication" as const, label: "Communication", icon: MessageSquare, color: "#a855f7" },
    { key: "price" as const, label: "Price", icon: DollarSign, color: "#f59e0b" },
    { key: "reliability" as const, label: "Reliability", icon: Shield, color: "#ec4899" },
  ];

  return (
    <div ref={ref} className={`space-y-4 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      {/* Grade & Score */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <GradeDisplay grade={scorecard.grade} score={scorecard.overallScore} trend={scorecard.trend} />
      </div>

      {/* Radar Chart */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-4">Criteria Breakdown</p>
        <div className="flex justify-center">
          <RadarChart criteria={scorecard.criteria} size={220} />
        </div>
      </div>

      {/* Criteria Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {criteriaConfig.map((c) => {
          const metric = scorecard.criteria[c.key];
          return (
            <div key={c.key} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <c.icon className="h-3.5 w-3.5" style={{ color: c.color }} />
                  <span className="text-xs text-neutral-400">{c.label}</span>
                </div>
                <span className="text-xs font-bold text-white">{metric.score}/100</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${metric.score}%`, backgroundColor: c.color }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] text-neutral-500">Weight: {(metric.weight * 100).toFixed(0)}%</span>
                <span className="text-[9px] text-neutral-500">Weighted: {metric.weightedScore.toFixed(1)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Score History */}
      <ScorecardHistory history={scorecard.history} />

      {/* Last Evaluated */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500">
        <Clock className="h-3 w-3" />
        Last evaluated: {new Date(scorecard.lastEvaluated).toLocaleDateString()}
      </div>
    </div>
  );
}
