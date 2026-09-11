"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, X } from "lucide-react";

interface PriceHistoryChartProps {
  data: Array<{ date: string; price: number }>;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PriceHistoryChart({ data, title, isOpen, onClose }: PriceHistoryChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const w = 300;
    const h = 120;
    const padding = { top: 10, right: 10, bottom: 20, left: 40 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartW;
      const y = padding.top + chartH - ((d.price - min) / range) * chartH;
      return { x, y, price: d.price, date: d.date };
    });

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

    const trend = prices[prices.length - 1] - prices[0];
    const trendPercent = prices[0] > 0 ? ((trend / prices[0]) * 100).toFixed(1) : "0";

    return { points, pathD, areaD, min, max, w, h, padding, chartW, chartH, trend, trendPercent };
  }, [data]);

  if (!isOpen || !chartData) return null;

  const { points, pathD, areaD, min, max, w, h, padding, chartW, chartH, trend, trendPercent } = chartData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white">Price History</h3>
            <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1 max-w-[280px]">{title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {/* Trend Summary */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
              trend > 0 ? "bg-emerald-500/10 text-emerald-400" : trend < 0 ? "bg-red-500/10 text-red-400" : "bg-surface text-muted-foreground"
            }`}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {trend > 0 ? "+" : ""}{trendPercent}%
            </div>
            <span className="text-[10px] text-gray-500">30-day trend</span>
          </div>

          {/* Chart */}
          <div className="relative bg-surface/30 rounded-xl p-2">
            <svg width={w} height={h} className="w-full">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const y = padding.top + chartH * (1 - pct);
                const price = min + (max - min) * pct;
                return (
                  <g key={pct}>
                    <line x1={padding.left} y1={y} x2={padding.left + chartW} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <text x={padding.left - 5} y={y + 3} textAnchor="end" className="text-[8px] fill-gray-500">
                      ${price.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              <path d={areaD} fill="url(#chartGradient)" opacity="0.3" />

              {/* Line */}
              <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />

              {/* Gradient definition */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" className="text-accent" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="currentColor" className="text-accent" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Data points */}
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredPoint === i ? 4 : 2}
                  fill="currentColor"
                  className="text-accent"
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}

              {/* Hover tooltip */}
              {hoveredPoint !== null && points[hoveredPoint] && (
                <g>
                  <line
                    x1={points[hoveredPoint].x}
                    y1={padding.top}
                    x2={points[hoveredPoint].x}
                    y2={padding.top + chartH}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <rect
                    x={points[hoveredPoint].x - 35}
                    y={padding.top - 20}
                    width="70"
                    height="16"
                    rx="4"
                    fill="rgba(0,0,0,0.8)"
                  />
                  <text
                    x={points[hoveredPoint].x}
                    y={padding.top - 9}
                    textAnchor="middle"
                    className="text-[9px] fill-white font-medium"
                  >
                    ${points[hoveredPoint].price.toFixed(2)}
                  </text>
                </g>
              )}
            </svg>

            {/* Date labels */}
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[8px] text-gray-500">{data[0]?.date}</span>
              <span className="text-[8px] text-gray-500">{data[Math.floor(data.length / 2)]?.date}</span>
              <span className="text-[8px] text-gray-500">{data[data.length - 1]?.date}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center p-2 rounded-lg bg-surface/30">
              <p className="text-[9px] text-gray-500 mb-0.5">Lowest</p>
              <p className="text-xs font-bold text-emerald-400">${Math.min(...data.map((d) => d.price)).toFixed(2)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-surface/30">
              <p className="text-[9px] text-gray-500 mb-0.5">Average</p>
              <p className="text-xs font-bold text-white">${(data.reduce((s, d) => s + d.price, 0) / data.length).toFixed(2)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-surface/30">
              <p className="text-[9px] text-gray-500 mb-0.5">Highest</p>
              <p className="text-xs font-bold text-red-400">${Math.max(...data.map((d) => d.price)).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
