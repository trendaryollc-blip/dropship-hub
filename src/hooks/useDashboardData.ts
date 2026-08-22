"use client";

import { useState, useCallback } from "react";
import {
  tickerItems,
  aiDailyPick,
  revenueData,
  smartAlerts,
  nicheCards,
  supplierStatuses,
  dailyMission,
  heatmapCategories,
  trendingProducts,
  gettingStartedTasks,
  quickActions,
  aiBriefing,
  marketPulseCards,
  quickActionStats,
} from "@/lib/mock-dashboard";
import type { TickerItem, AIDailyPick, SmartAlert, NicheCard, SupplierStatus, DailyMission, HeatmapCategory, AIBriefing, MarketPulseCard, QuickActionStat, TrendingProduct } from "@/lib/mock-dashboard";

export interface DashboardData {
  ticker: TickerItem[];
  dailyPick: AIDailyPick;
  revenue: typeof revenueData;
  alerts: SmartAlert[];
  niches: NicheCard[];
  suppliers: SupplierStatus[];
  mission: DailyMission;
  heatmap: HeatmapCategory[];
  trending: TrendingProduct[];
  tasks: typeof gettingStartedTasks;
  actions: typeof quickActions;
  compareItems: { name: string; price: number; margin: number; image: string }[];
  briefing: AIBriefing;
  pulse: MarketPulseCard[];
  actionStats: QuickActionStat[];
}

export function useDashboardData() {
  const [alerts, setAlerts] = useState(smartAlerts);
  const [compareItems, setCompareItems] = useState<DashboardData["compareItems"]>([]);

  const markAlertRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  const markAllAlertsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const addToCompare = useCallback((item: { name: string; price: number; margin: number; image: string }) => {
    setCompareItems((prev) => {
      if (prev.length >= 4) return prev;
      if (prev.some((c) => c.name === item.name)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeFromCompare = useCallback((name: string) => {
    setCompareItems((prev) => prev.filter((c) => c.name !== name));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareItems([]);
  }, []);

  const data: DashboardData = {
    ticker: tickerItems,
    dailyPick: aiDailyPick,
    revenue: revenueData,
    alerts,
    niches: nicheCards,
    suppliers: supplierStatuses,
    mission: dailyMission,
    heatmap: heatmapCategories,
    trending: trendingProducts,
    tasks: gettingStartedTasks,
    actions: quickActions,
    compareItems,
    briefing: aiBriefing,
    pulse: marketPulseCards,
    actionStats: quickActionStats,
  };

  return {
    data,
    markAlertRead,
    markAllAlertsRead,
    addToCompare,
    removeFromCompare,
    clearCompare,
  };
}
