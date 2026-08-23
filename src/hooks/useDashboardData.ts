"use client";

import { useState, useCallback, useEffect } from "react";
import {
  tickerItems as fallbackTicker,
  aiDailyPick as fallbackPick,
  revenueData as fallbackRevenue,
  smartAlerts as fallbackAlerts,
  nicheCards as fallbackNiches,
  supplierStatuses as fallbackSuppliers,
  dailyMission as fallbackMission,
  heatmapCategories as fallbackHeatmap,
  trendingProducts as fallbackTrending,
  gettingStartedTasks as fallbackTasks,
  quickActions as fallbackActions,
  aiBriefing as fallbackBriefing,
  marketPulseCards as fallbackPulse,
  quickActionStats as fallbackActionStats,
} from "@/lib/mock-dashboard";
import type { TickerItem, AIDailyPick, SmartAlert, NicheCard, SupplierStatus, DailyMission, HeatmapCategory, AIBriefing, MarketPulseCard, QuickActionStat, TrendingProduct } from "@/lib/mock-dashboard";

export interface DashboardData {
  ticker: TickerItem[];
  dailyPick: AIDailyPick;
  revenue: typeof fallbackRevenue;
  alerts: SmartAlert[];
  niches: NicheCard[];
  suppliers: SupplierStatus[];
  mission: DailyMission;
  heatmap: HeatmapCategory[];
  trending: TrendingProduct[];
  tasks: typeof fallbackTasks;
  actions: typeof fallbackActions;
  compareItems: { name: string; price: number; margin: number; image: string }[];
  briefing: AIBriefing;
  pulse: MarketPulseCard[];
  actionStats: QuickActionStat[];
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    ticker: fallbackTicker,
    dailyPick: fallbackPick,
    revenue: fallbackRevenue,
    alerts: fallbackAlerts,
    niches: fallbackNiches,
    suppliers: fallbackSuppliers,
    mission: fallbackMission,
    heatmap: fallbackHeatmap,
    trending: fallbackTrending,
    tasks: fallbackTasks,
    actions: fallbackActions,
    compareItems: [],
    briefing: fallbackBriefing,
    pulse: fallbackPulse,
    actionStats: fallbackActionStats,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const apiData = await res.json();
          setData((prev) => ({
            ...prev,
            ticker: apiData.ticker?.length ? apiData.ticker : prev.ticker,
            dailyPick: apiData.dailyPick || prev.dailyPick,
            revenue: apiData.revenue || prev.revenue,
            alerts: apiData.alerts?.length ? apiData.alerts : prev.alerts,
            niches: apiData.niches?.length ? apiData.niches : prev.niches,
            suppliers: apiData.suppliers?.length ? apiData.suppliers : prev.suppliers,
            mission: apiData.mission || prev.mission,
            heatmap: apiData.heatmap?.length ? apiData.heatmap : prev.heatmap,
            trending: apiData.trending?.length ? apiData.trending : prev.trending,
            briefing: apiData.briefing || prev.briefing,
            pulse: apiData.pulse?.length ? apiData.pulse : prev.pulse,
            actionStats: apiData.actionStats?.length ? apiData.actionStats : prev.actionStats,
          }));
        }
      } catch {}
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  const [alerts, setAlerts] = useState(data.alerts);
  const [compareItems, setCompareItems] = useState<DashboardData["compareItems"]>([]);

  useEffect(() => {
    setAlerts(data.alerts);
  }, [data.alerts]);

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

  return {
    data: { ...data, alerts, compareItems },
    loading,
    markAlertRead,
    markAllAlertsRead,
    addToCompare,
    removeFromCompare,
    clearCompare,
  };
}
