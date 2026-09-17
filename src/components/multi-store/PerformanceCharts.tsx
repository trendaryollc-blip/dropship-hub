"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import type { StorePerformance } from "@/types/multi-store";
import { platformColors } from "./constants";

interface PerformanceChartsProps {
  performances: StorePerformance[];
}

const CHART_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

export default function PerformanceCharts({ performances }: PerformanceChartsProps) {
  const revenueData = useMemo(() =>
    performances.map((p) => ({
      name: p.storeName.length > 12 ? p.storeName.slice(0, 12) + "..." : p.storeName,
      revenue: p.metrics.totalRevenue,
      orders: p.metrics.totalOrders,
      color: platformColors[p.storePlatform] || "#6b7280",
    })),
    [performances]
  );

  const revenuePieData = useMemo(() =>
    performances.map((p) => ({
      name: p.storeName,
      value: p.metrics.totalRevenue,
    })),
    [performances]
  );

  const metricsData = useMemo(() =>
    performances.map((p) => ({
      name: p.storeName.length > 10 ? p.storeName.slice(0, 10) + "..." : p.storeName,
      aov: p.metrics.avgOrderValue,
      conv: p.metrics.conversionRate,
      fulfillment: p.metrics.fulfillmentRate,
    })),
    [performances]
  );

  if (performances.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3">Revenue by Store</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {revenueData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3">Revenue Share</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={revenuePieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {revenuePieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
              />
              <Legend wrapperStyle={{ fontSize: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <h4 className="text-xs font-semibold text-foreground mb-3">Key Metrics Comparison</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={metricsData}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
            />
            <Bar dataKey="aov" fill="#3b82f6" name="Avg Order ($)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="conv" fill="#10b981" name="Conv. Rate (%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="fulfillment" fill="#8b5cf6" name="Fulfillment (%)" radius={[4, 4, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: "10px" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
