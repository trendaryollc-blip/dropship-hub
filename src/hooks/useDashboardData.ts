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
} from "@/lib/mock-dashboard";
import type { TickerItem, AIDailyPick, SmartAlert, NicheCard, SupplierStatus, DailyMission, HeatmapCategory, TrendingProduct } from "@/lib/mock-dashboard";

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

const fallbackBriefing: AIBriefing = {
  insights: ["Scanning CJ Dropshipping for products..."],
  sentiment: 50,
  sentimentLabel: "Neutral",
  opportunities: 0,
  risks: 0,
  trends: 0,
  lastScan: "loading...",
};

const fallbackPulse: MarketPulseCard[] = [];
const fallbackActionStats: QuickActionStat[] = [];

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
            dailyPick: apiData.aiDailyPick || prev.dailyPick,
            revenue: apiData.revenueStats ? {
              actual: prev.revenue.actual,
              predicted: prev.revenue.predicted,
              stats: apiData.revenueStats,
            } : prev.revenue,
            alerts: apiData.alerts?.length ? apiData.alerts : prev.alerts,
            niches: apiData.nicheCards?.length ? apiData.nicheCards : prev.niches,
            suppliers: apiData.supplierStatuses?.length ? apiData.supplierStatuses : prev.suppliers,
            mission: prev.mission,
            heatmap: apiData.heatmap?.length ? apiData.heatmap : prev.heatmap,
            trending: apiData.trending?.length ? apiData.trending : prev.trending,
            briefing: apiData.briefing || prev.briefing,
            pulse: apiData.pulse?.length ? apiData.pulse : prev.pulse,
            actionStats: apiData.actionStats?.length ? apiData.actionStats : prev.actionStats,
          }));
        }
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  const [compareItems, setCompareItems] = useState<DashboardData["compareItems"]>([]);

  const markAlertRead = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
    }));
  }, []);

  const markAllAlertsRead = useCallback(() => {
    setData((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => ({ ...a, read: true })),
    }));
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
    data: { ...data, compareItems },
    loading,
    markAlertRead,
    markAllAlertsRead,
    addToCompare,
    removeFromCompare,
    clearCompare,
  };
}
