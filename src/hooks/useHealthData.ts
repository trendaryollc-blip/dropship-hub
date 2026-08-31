"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  getSearchHistory,
  getCalcHistory,
  getCompetitorSearches,
  getCostProfiles,
  getStoreConnections,
  getRevenueEntries,
  getWatchlist,
  getFavorites,
} from "@/lib/data";
import { logger } from "@/lib/logger";


export interface HealthData {
  searchHistoryCount: number;
  calcHistoryCount: number;
  competitorSearchCount: number;
  costProfileCount: number;
  storeConnectionCount: number;
  revenueEntryCount: number;
  watchlistCount: number;
  savedProductCount: number;
  supplierFavoriteCount: number;
  loading: boolean;
}

export function useHealthData() {
  const { user } = useAuth();
  const [data, setData] = useState<HealthData>({
    searchHistoryCount: 0,
    calcHistoryCount: 0,
    competitorSearchCount: 0,
    costProfileCount: 0,
    storeConnectionCount: 0,
    revenueEntryCount: 0,
    watchlistCount: 0,
    savedProductCount: 0,
    supplierFavoriteCount: 0,
    loading: true,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const fetchHealthData = useCallback(async () => {
    if (!user) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const results = await Promise.allSettled([
        getSearchHistory(user.uid, 100),
        getCalcHistory(user.uid),
        getCompetitorSearches(user.uid, 100),
        getCostProfiles(user.uid),
        getStoreConnections(user.uid),
        getRevenueEntries(user.uid, 100),
        getWatchlist(user.uid),
        getFavorites(user.uid, "product"),
        getFavorites(user.uid, "supplier"),
      ]);

      const getCount = (r: PromiseSettledResult<unknown[]>) =>
        r.status === "fulfilled" ? r.value.length : 0;

      if (!controller.signal.aborted) {
        setData({
          searchHistoryCount: getCount(results[0]),
          calcHistoryCount: getCount(results[1]),
          competitorSearchCount: getCount(results[2]),
          costProfileCount: getCount(results[3]),
          storeConnectionCount: getCount(results[4]),
          revenueEntryCount: getCount(results[5]),
          watchlistCount: getCount(results[6]),
          savedProductCount: getCount(results[7]),
          supplierFavoriteCount: getCount(results[8]),
          loading: false,
        });
      }
    } catch (error) {
      logger.error("Failed to fetch health data", { error: error instanceof Error ? error.message : String(error) });
      if (!controller.signal.aborted) setData((prev) => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    void fetchHealthData();
  }, [fetchHealthData]);

  return { ...data, refresh: fetchHealthData };
}
