"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { TickerItem, AIDailyPick, SmartAlert, NicheCard, SupplierStatus, HeatmapCategory, TrendingProduct, FulfillmentPipelineData, ContextualAction } from "@/types/dashboard";
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

interface RevenueStats {
  revenue: number;
  growth: number;
  orders: number;
  avgOrder: number;
}

interface RevenueChartPoint {
  date: string;
  value: number;
}

/** Reported by /api/dashboard when a data source has degraded. */
export interface DashboardDataQuality {
  /** True when the CJ product-discovery feed responded with products. */
  cj: boolean;
  /** True when the per-user Firestore read succeeded. */
  firestore: boolean;
}

export interface DashboardData {
  ticker: TickerItem[];
  dailyPick: AIDailyPick | null;
  revenueStats: RevenueStats;
  revenueChart: RevenueChartPoint[];
  alerts: SmartAlert[];
  niches: NicheCard[];
  suppliers: SupplierStatus[];
  heatmap: HeatmapCategory[];
  trending: TrendingProduct[];
  compareItems: { name: string; price: number; margin: number; image: string }[];
  briefing: AIBriefing;
  pulse: MarketPulseCard[];
  actionStats: QuickActionStat[];
  fulfillmentPipeline: FulfillmentPipelineData;
  contextualActions: ContextualAction[];
  /** Undefined on older payloads — treat as "all sources healthy". */
  dataQuality?: DashboardDataQuality;
  storesCount: number;
  healthScore: number | null;
}

// ── Persisted "read alert" ids ────────────────────────────────────────────
// Alert read state must survive the 60s background revalidation (and reloads),
// so dismissed ids are kept in localStorage and merged over fetched data.
const READ_ALERTS_STORAGE_KEY = "dashboard:read-alert-ids";
const MAX_PERSISTED_ALERT_IDS = 200;

function loadReadAlertIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(READ_ALERTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function persistReadAlertIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    // Cap the list so it can't grow unbounded in localStorage.
    window.localStorage.setItem(READ_ALERTS_STORAGE_KEY, JSON.stringify(ids.slice(-MAX_PERSISTED_ALERT_IDS)));
  } catch {
    // Storage full/unavailable — read state just won't persist.
  }
}

const defaults = {
  ticker: [] as TickerItem[],
  dailyPick: null as AIDailyPick | null,
  revenueStats: { revenue: 0, growth: 0, orders: 0, avgOrder: 0 } as RevenueStats,
  revenueChart: [] as RevenueChartPoint[],
  alerts: [] as SmartAlert[],
  niches: [] as NicheCard[],
  suppliers: [] as SupplierStatus[],
  heatmap: [] as HeatmapCategory[],
  trending: [] as TrendingProduct[],
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
  fulfillmentPipeline: {
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    totalRevenue: 0,
    totalProfit: 0,
    recentOrders: [],
  } as FulfillmentPipelineData,
  contextualActions: [] as ContextualAction[],
  storesCount: 0,
  healthScore: null as number | null,
};

export interface UseDashboardDataResult {
  data: DashboardData;
  loading: boolean;
  /** Set when the last fetch failed; undefined on success. */
  error?: unknown;
  /** True once at least one successful response has been received. */
  hasData?: boolean;
  /** Manually revalidate the dashboard feed. */
  refresh?: () => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  addToCompare: (item: { name: string; price: number; margin: number; image: string }) => void;
  removeFromCompare: (name: string) => void;
  clearCompare: () => void;
}

export function useDashboardData(): UseDashboardDataResult {
  const { data: apiData, isLoading, mutate, error } = useAPI<{
    ticker?: TickerItem[];
    aiDailyPick?: AIDailyPick | null;
    revenueStats?: RevenueStats;
    revenueChart?: RevenueChartPoint[];
    alerts?: SmartAlert[];
    nicheCards?: NicheCard[];
    supplierStatuses?: SupplierStatus[];
    heatmap?: HeatmapCategory[];
    trending?: TrendingProduct[];
    briefing?: AIBriefing;
    pulse?: MarketPulseCard[];
    actionStats?: QuickActionStat[];
    fulfillmentPipeline?: FulfillmentPipelineData;
    contextualActions?: ContextualAction[];
    storesCount?: number;
    healthScore?: number | null;
    dataQuality?: DashboardDataQuality;
  }>("/api/dashboard", {
    refreshInterval: 60000,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    // The 60s interval keeps data fresh; don't refetch the full payload on
    // every tab focus (SWR dedupes within 5s, but it's still a full request).
    revalidateOnFocus: false,
    // Keep the last payload mounted during background refreshes so sections
    // don't flash back to skeletons.
    keepPreviousData: true,
    // One automatic retry on transient failures, then surface the error.
    shouldRetryOnError: true,
    errorRetryCount: 1,
  });

  // ── Persisted "read alert" state ──────────────────────────────────────────
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);
  const hydratedRef = useRef(false);

  // Hydrate once on mount (client only).
  useEffect(() => {
    hydratedRef.current = true;
    const ids = loadReadAlertIds();
    if (ids.length > 0) setReadAlertIds(ids);
  }, []);

  // Persist whenever the set changes (after hydration, so we never clobber
  // stored ids with an empty initial state).
  useEffect(() => {
    if (!hydratedRef.current) return;
    persistReadAlertIds(readAlertIds);
  }, [readAlertIds]);

  const data: DashboardData = {
    ticker: apiData?.ticker?.length ? apiData.ticker : defaults.ticker,
    dailyPick: apiData?.aiDailyPick ?? defaults.dailyPick,
    revenueStats: apiData?.revenueStats ?? defaults.revenueStats,
    revenueChart: apiData?.revenueChart ?? defaults.revenueChart,
    // Merge locally-dismissed alert ids over the fetched list so a background
    // revalidation doesn't resurrect "unread" badges the user already cleared.
    alerts: apiData?.alerts?.length
      ? apiData.alerts.map((a) => (readAlertIds.includes(a.id) ? { ...a, read: true } : a))
      : defaults.alerts,
    niches: apiData?.nicheCards?.length ? apiData.nicheCards : defaults.niches,
    suppliers: apiData?.supplierStatuses?.length ? apiData.supplierStatuses : defaults.suppliers,
    heatmap: apiData?.heatmap?.length ? apiData.heatmap : defaults.heatmap,
    trending: apiData?.trending?.length ? apiData.trending : defaults.trending,
    compareItems: [],
    briefing: apiData?.briefing ?? defaults.briefing,
    pulse: apiData?.pulse?.length ? apiData.pulse : defaults.pulse,
    actionStats: apiData?.actionStats?.length ? apiData.actionStats : defaults.actionStats,
    fulfillmentPipeline: apiData?.fulfillmentPipeline ?? defaults.fulfillmentPipeline,
    contextualActions: apiData?.contextualActions ?? defaults.contextualActions,
    dataQuality: apiData?.dataQuality,
    storesCount: apiData?.storesCount ?? defaults.storesCount,
    healthScore: apiData?.healthScore ?? defaults.healthScore,
  };

  const [compareItems, setCompareItems] = useState<DashboardData["compareItems"]>([]);

  const markAlertRead = useCallback((id: string) => {
    // Persist the id so the state survives the next background revalidation.
    setReadAlertIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
    mutate((prev) => {
      if (!prev?.alerts) return prev;
      return { ...prev, alerts: prev.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)) };
    }, { revalidate: false });
  }, [mutate]);

  const markAllAlertsRead = useCallback(() => {
    const ids = (apiData?.alerts ?? []).map((a) => a.id);
    if (ids.length > 0) {
      setReadAlertIds((prev) => {
        const merged = new Set(prev);
        for (const id of ids) merged.add(id);
        return Array.from(merged);
      });
    }
    mutate((prev) => {
      if (!prev?.alerts) return prev;
      return { ...prev, alerts: prev.alerts.map((a) => ({ ...a, read: true })) };
    }, { revalidate: false });
  }, [apiData, mutate]);

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
    error: error as unknown,
    hasData: apiData !== undefined,
    refresh: mutate,
    markAlertRead,
    markAllAlertsRead,
    addToCompare,
    removeFromCompare,
    clearCompare,
  };
}
