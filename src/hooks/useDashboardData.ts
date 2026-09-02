"use client";

import { useState, useCallback } from "react";
import type { TickerItem, AIDailyPick, SmartAlert, NicheCard, SupplierStatus, DailyMission, HeatmapCategory, TrendingProduct } from "@/types/dashboard";
import { useAPI } from "@/hooks/useAPI";

interface AIBriefing {
  insights: string[];
  sentiment: number;
  sentimentLabel: string;
  opportunities: number;
  risks: number;
  trends: number;
  lastScan: string;
}

interface MarketPulseCard {
  label: string;
  value: string;
  change: string;
  up: boolean;
  sparkline: number[];
  icon: string;
  color: string;
}

interface QuickActionStat {
  label: string;
  description: string;
  href: string;
  color: string;
  stat: string;
  statLabel: string;
}

interface RevenueData {
  actual: { date: string; value: number }[];
  predicted: { date: string; value: number }[];
  stats: { revenue: number; growth: number; orders: number; avgOrder: number };
}

export interface DashboardData {
  ticker: TickerItem[];
  dailyPick: AIDailyPick | null;
  revenue: RevenueData;
  alerts: SmartAlert[];
  niches: NicheCard[];
  suppliers: SupplierStatus[];
  mission: DailyMission | null;
  heatmap: HeatmapCategory[];
  trending: TrendingProduct[];
  tasks: { id: string; text: string; done: boolean }[];
  actions: { label: string; href: string; icon: string; color: string }[];
  compareItems: { name: string; price: number; margin: number; image: string }[];
  briefing: AIBriefing;
  pulse: MarketPulseCard[];
  actionStats: QuickActionStat[];
}

const defaults = {
  ticker: [] as TickerItem[],
  dailyPick: null as AIDailyPick | null,
  revenue: { actual: [], predicted: [], stats: { revenue: 0, growth: 0, orders: 0, avgOrder: 0 } } as RevenueData,
  alerts: [] as SmartAlert[],
  niches: [] as NicheCard[],
  suppliers: [] as SupplierStatus[],
  mission: null as DailyMission | null,
  heatmap: [] as HeatmapCategory[],
  trending: [] as TrendingProduct[],
  tasks: [] as { id: string; text: string; done: boolean }[],
  actions: [] as { label: string; href: string; icon: string; color: string }[],
  briefing: {
    insights: [],
    sentiment: 50,
    sentimentLabel: "Neutral",
    opportunities: 0,
    risks: 0,
    trends: 0,
    lastScan: "",
  } as AIBriefing,
  pulse: [] as MarketPulseCard[],
  actionStats: [] as QuickActionStat[],
};

export function useDashboardData() {
  const { data: apiData, isLoading, mutate } = useAPI<{
    ticker?: TickerItem[];
    aiDailyPick?: AIDailyPick | null;
    revenueStats?: { revenue: number; growth: number; orders: number; avgOrder: number };
    alerts?: SmartAlert[];
    nicheCards?: NicheCard[];
    supplierStatuses?: SupplierStatus[];
    heatmap?: HeatmapCategory[];
    trending?: TrendingProduct[];
    briefing?: AIBriefing;
    pulse?: MarketPulseCard[];
    actionStats?: QuickActionStat[];
  }>("/api/dashboard", {
    refreshInterval: 60000,
  });

  const data: DashboardData = {
    ticker: apiData?.ticker?.length ? apiData.ticker : defaults.ticker,
    dailyPick: apiData?.aiDailyPick ?? defaults.dailyPick,
    revenue: {
      actual: defaults.revenue.actual,
      predicted: defaults.revenue.predicted,
      stats: apiData?.revenueStats ?? defaults.revenue.stats,
    },
    alerts: apiData?.alerts?.length ? apiData.alerts : defaults.alerts,
    niches: apiData?.nicheCards?.length ? apiData.nicheCards : defaults.niches,
    suppliers: apiData?.supplierStatuses?.length ? apiData.supplierStatuses : defaults.suppliers,
    mission: defaults.mission,
    heatmap: apiData?.heatmap?.length ? apiData.heatmap : defaults.heatmap,
    trending: apiData?.trending?.length ? apiData.trending : defaults.trending,
    tasks: defaults.tasks,
    actions: defaults.actions,
    compareItems: [],
    briefing: apiData?.briefing ?? defaults.briefing,
    pulse: apiData?.pulse?.length ? apiData.pulse : defaults.pulse,
    actionStats: apiData?.actionStats?.length ? apiData.actionStats : defaults.actionStats,
  };

  const [compareItems, setCompareItems] = useState<DashboardData["compareItems"]>([]);

  const markAlertRead = useCallback((id: string) => {
    mutate((prev) => {
      if (!prev?.alerts) return prev;
      return { ...prev, alerts: prev.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)) };
    }, { revalidate: false });
  }, [mutate]);

  const markAllAlertsRead = useCallback(() => {
    mutate((prev) => {
      if (!prev?.alerts) return prev;
      return { ...prev, alerts: prev.alerts.map((a) => ({ ...a, read: true })) };
    }, { revalidate: false });
  }, [mutate]);

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
    data: { ...data, compareItems },
    loading: isLoading,
    markAlertRead,
    markAllAlertsRead,
    addToCompare,
    removeFromCompare,
    clearCompare,
  };
}
