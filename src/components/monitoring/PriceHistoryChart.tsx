"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface PriceHistoryEntry {
  date: string;
  price: number;
  source?: string;
}

interface PriceHistoryChartProps {
  history: PriceHistoryEntry[];
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  className?: string;
}

type Range = "7d" | "30d" | "90d";

export default function PriceHistoryChart({
  history,
  currentPrice,
  lowestPrice,
  highestPrice,
  className = "",
}: PriceHistoryChartProps) {
  const [range, setRange] = useState<Range>("30d");

  const filteredData = useMemo(() => {
    const now = new Date();
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 86400000).toISOString().split("T")[0];

    return history
      .filter((entry) => entry.date >= cutoff)
      .map((entry) => ({
        date: entry.date,
        price: entry.price,
        label: new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      }));
  }, [history, range]);

  if (filteredData.length < 2) {
    return (
      <div className={`glass rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-foreground">Price History</h4>
          <RangeSelector value={range} onChange={setRange} />
        </div>
        <p className="text-xs text-muted-foreground text-center py-8">
          Not enough price data to display chart. At least 2 data points needed.
        </p>
      </div>
    );
  }

  return (
    <div className={`glass rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-foreground">Price History</h4>
        <RangeSelector value={range} onChange={setRange} />
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
              labelFormatter={(label: string) => `Date: ${label}`}
            />
            <ReferenceLine
              y={currentPrice}
              stroke="var(--accent)"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: "Current",
                position: "right",
                fontSize: 9,
                fill: "var(--accent)",
              }}
            />
            <ReferenceLine
              y={lowestPrice}
              stroke="#22c55e"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: "Low",
                position: "right",
                fontSize: 9,
                fill: "#22c55e",
              }}
            />
            <ReferenceLine
              y={highestPrice}
              stroke="#ef4444"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: "High",
                position: "right",
                fontSize: 9,
                fill: "#ef4444",
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RangeSelector({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const ranges: Range[] = ["7d", "30d", "90d"];
  return (
    <div className="flex items-center bg-surface rounded-lg border border-border p-0.5">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
            value === r ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
