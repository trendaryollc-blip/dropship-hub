"use client";

// ── Search Tracking Context ───────────────────────────────────────────────
//
// Tracks user search behavior (searches, clicks, saves, views) to build
// a personalization profile for improving search ranking.

// ── Types ──────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";

export interface UserProfile {
  preferredCategories: string[];
  preferredPlatforms: string[];
  priceRange: { min: number; max: number };
  avgRating: number;
  lastUpdated: string;
}

export interface SearchTrackingContextValue {
  trackSearch: (query: string, resultCount: number) => void;
  trackClick: (productId: string, query: string, platform: string) => void;
  trackSave: (productId: string, query: string) => void;
  trackView: (productId: string, query: string, durationMs: number) => void;
  trackCompare: (productIds: string[], query: string) => void;
  getPersonalizationProfile: () => Promise<UserProfile>;
}

// ── Default Profile ──────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  preferredCategories: [],
  preferredPlatforms: [],
  priceRange: { min: 0, max: 1000 },
  avgRating: 4.0,
  lastUpdated: new Date().toISOString(),
};

// ── Context ───────────────────────────────────────────────────────────────

const SearchTrackingContext = createContext<SearchTrackingContextValue | null>(null);

export function useSearchTracking(): SearchTrackingContextValue {
  const ctx = useContext(SearchTrackingContext);
  if (!ctx) throw new Error("useSearchTracking must be used within SearchTrackingProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────

export interface SearchTrackingProviderProps {
  children: ReactNode;
  userId?: string;
  trackFn?: (event: string, data: Record<string, unknown>) => Promise<void>;
  getProfileFn?: () => Promise<UserProfile>;
}

export function SearchTrackingProvider({
  children,
  userId,
  trackFn,
  getProfileFn,
}: SearchTrackingProviderProps) {
  const pendingRef = useRef<Record<string, unknown>[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (pendingRef.current.length === 0 || !trackFn) return;
    const batch = [...pendingRef.current];
    pendingRef.current = [];
    try {
      await trackFn("batch", { events: batch });
    } catch {
      // silently ignore tracking failures
    }
  }, [trackFn]);

  const enqueue = useCallback(
    (event: string, data: Record<string, unknown>) => {
      if (!userId || !trackFn) return;
      pendingRef.current.push({ type: event, data: { ...data, userId, timestamp: new Date().toISOString() } });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flush, 500);
    },
    [userId, trackFn, flush]
  );

  const trackSearch = useCallback(
    (query: string, resultCount: number) => {
      enqueue("search", { query, resultCount });
    },
    [enqueue]
  );

  const trackClick = useCallback(
    (productId: string, query: string, platform: string) => {
      enqueue("click", { productId, query, platform });
    },
    [enqueue]
  );

  const trackSave = useCallback(
    (productId: string, query: string) => {
      enqueue("save", { productId, query });
    },
    [enqueue]
  );

  const trackView = useCallback(
    (productId: string, query: string, durationMs: number) => {
      enqueue("view", { productId, query, durationMs });
    },
    [enqueue]
  );

  const trackCompare = useCallback(
    (productIds: string[], query: string) => {
      enqueue("compare", { productIds, query });
    },
    [enqueue]
  );

  const getPersonalizationProfile = useCallback(async (): Promise<UserProfile> => {
    if (getProfileFn) return getProfileFn();
    return DEFAULT_PROFILE;
  }, [getProfileFn]);

  const value = useMemo<SearchTrackingContextValue>(
    () => ({
      trackSearch,
      trackClick,
      trackSave,
      trackView,
      trackCompare,
      getPersonalizationProfile,
    }),
    [trackSearch, trackClick, trackSave, trackView, trackCompare, getPersonalizationProfile]
  );

  return (
    <SearchTrackingContext.Provider value={value}>
      {children}
    </SearchTrackingContext.Provider>
  );
}

export { SearchTrackingContext };
