"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "searchHistory";
const MAX_SEARCHES = 10;

export interface SearchHistoryEntry {
  query: string;
  results: Array<Record<string, unknown>>;
  platforms: string[];
  timestamp: number;
  clickedProductIds: string[];
}

function loadHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e): e is SearchHistoryEntry =>
        e && typeof e.query === "string" && Array.isArray(e.results) && Array.isArray(e.platforms) && typeof e.timestamp === "number" && Array.isArray(e.clickedProductIds)
      )
      .slice(0, MAX_SEARCHES);
  } catch {
    return [];
  }
}

function saveHistory(history: SearchHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_SEARCHES)));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(() => loadHistory());

  const addSearch = useCallback((query: string, results: Array<Record<string, unknown>>, platforms: string[]) => {
    if (!query.trim() || results.length === 0) return;
    setHistory((prev) => {
      const entry: SearchHistoryEntry = {
        query: query.trim(),
        results,
        platforms,
        timestamp: Date.now(),
        clickedProductIds: [],
      };
      const updated = [entry, ...prev.filter((e) => e.query.toLowerCase() !== query.trim().toLowerCase())].slice(0, MAX_SEARCHES);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const markProductClicked = useCallback((productId: string) => {
    if (!productId) return;
    setHistory((prev) => {
      let changed = false;
      const updated = prev.map((entry) => {
        if (entry.results.some((p) => (p.id as string) === productId || (p.title as string) === productId)) {
          if (!entry.clickedProductIds.includes(productId)) {
            changed = true;
            return { ...entry, clickedProductIds: [...entry.clickedProductIds, productId] };
          }
        }
        return entry;
      });
      if (changed) saveHistory(updated);
      return updated;
    });
  }, []);

  const getInterestedProducts = useCallback((): Array<Record<string, unknown> & { _sourceQuery: string }> => {
    const allInterested: Array<Record<string, unknown> & { _sourceQuery: string }> = [];
    const seenIds = new Set<string>();

    for (const entry of history) {
      for (const product of entry.results) {
        const id = (product.id as string) || (product.title as string);
        if (!id) continue;
        if (entry.clickedProductIds.includes(id) && !seenIds.has(id)) {
          seenIds.add(id);
          allInterested.push({ ...product, _sourceQuery: entry.query });
        }
      }
    }

    return allInterested;
  }, [history]);

  const getInterestProfile = useCallback(() => {
    const clickedProducts = getInterestedProducts();
    if (clickedProducts.length === 0) return null;

    const sources: Record<string, number> = {};
    const categories: Record<string, number> = {};
    let totalPrice = 0;
    let priceCount = 0;

    for (const product of clickedProducts) {
      const source = product.source as string;
      if (source) sources[source] = (sources[source] || 0) + 1;

      const category = product.category as string;
      if (category) categories[category] = (categories[category] || 0) + 1;

      const price = product.price as number | null;
      if (price != null && price > 0) {
        totalPrice += price;
        priceCount++;
      }
    }

    const topSources = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);
    const topCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
    const avgPrice = priceCount > 0 ? totalPrice / priceCount : null;

    return {
      topSources,
      topCategories,
      avgPrice,
      totalClicked: clickedProducts.length,
    };
  }, [getInterestedProducts]);

  const getSmartRecommendations = useCallback((): Array<Record<string, unknown>> => {
    const profile = getInterestProfile();
    const allResults: Array<Record<string, unknown> & { _score: number }> = [];
    const seenIds = new Set<string>();

    for (const entry of history) {
      for (const product of entry.results) {
        const id = (product.id as string) || (product.title as string);
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        let score = 0;

        if (profile) {
          // Source match
          if (profile.topSources.includes(product.source as string)) score += 3;

          // Category match
          if (profile.topCategories.includes(product.category as string)) score += 2;

          // Price range match
          const price = product.price as number | null;
          if (price != null && price > 0 && profile.avgPrice != null && profile.avgPrice > 0) {
            const diff = Math.abs(price - profile.avgPrice) / profile.avgPrice;
            if (diff < 0.3) score += 2;
            else if (diff < 0.5) score += 1;
          }
        }

        // Rating bonus
        const rating = product.rating as number | undefined;
        if (rating != null && rating >= 4) score += 1;

        // Golden score bonus
        const golden = product.goldenScore as number | undefined;
        if (golden != null && golden >= 80) score += 1;

        // Recency bonus (newer searches score higher)
        const ageHours = (Date.now() - entry.timestamp) / (1000 * 60 * 60);
        if (ageHours < 24) score += 1;
        else if (ageHours < 72) score += 0.5;

        if (score > 0) {
          allResults.push({ ...product, _score: score });
        }
      }
    }

    // If no profile yet, return all products sorted by recency
    if (!profile) {
      return allResults
        .sort((a, b) => ((b._score as number) || 0) - ((a._score as number) || 0))
        .slice(0, 20);
    }

    return allResults.sort((a, b) => b._score - a._score).slice(0, 20);
  }, [getInterestProfile, history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch { /* ignore */ }
    }
  }, []);

  return {
    history,
    addSearch,
    markProductClicked,
    getInterestedProducts,
    getInterestProfile,
    getSmartRecommendations,
    clearHistory,
  };
}
