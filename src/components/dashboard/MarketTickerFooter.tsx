"use client";

import { Activity } from "lucide-react";
import { MiniSparkline } from "./MiniSparkline";
import type { TickerItem } from "@/types/dashboard";

export function MarketTickerFooter({ ticker }: { ticker: TickerItem[] }) {
  if (ticker.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Market Ticker</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
        {ticker.map((t, i) => (
          <div key={`${t.name}-${t.change}-${i}`} className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-white">{t.name}</span>
            <span className="text-[10px] text-gray-500">{t.platform}</span>
            <span className="text-[10px] text-gray-500">${t.price?.toFixed(2)}</span>
            <span title="Price vs category average" className={`text-[10px] font-bold ${t.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {t.change >= 0 ? "+" : ""}{t.change}%
            </span>
            <MiniSparkline data={t.sparkline} color={t.change >= 0 ? "#22c55e" : "#ef4444"} width={40} height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
