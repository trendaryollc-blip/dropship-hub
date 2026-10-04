"use client";

import { useState, useMemo, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, AlertTriangle, X,
} from "lucide-react";
import SearchHeader from "@/components/products/SearchHeader";
import FilterPanel, { Filters } from "@/components/products/FilterPanel";
import EnrichedProductCard, { type EnrichedProduct } from "@/components/products/EnrichedProductCard";
import ListItemCard from "@/components/products/ListItemCard";
import ResultsHeader from "@/components/products/ResultsHeader";
import ComparePanel from "@/components/products/ComparePanel";
import PlatformProgress from "@/components/products/PlatformProgress";
import QuickActionChips from "@/components/products/QuickActionChips";
import AICollections from "@/components/products/AICollections";
import PersonalizedRecommendations from "@/components/products/PersonalizedRecommendations";
import SearchAlertModal, { type SearchAlertData } from "@/components/products/SearchAlertModal";
import BackToTopButton from "@/components/products/BackToTopButton";
import HowItWorksSection from "@/components/products/HowItWorksSection";
import ProductsEmptyState from "@/components/products/ProductsEmptyState";
import TrendingSection from "@/components/products/TrendingSection";
import NichesSection from "@/components/products/NichesSection";
import CategoriesSection from "@/components/products/CategoriesSection";
import SmartFeed from "@/components/products/SmartFeed";
import BulkActionsBar from "@/components/products/BulkActionsBar";

import { useAuth } from "@/components/auth/AuthProvider";
import { useSearchTracking } from "@/contexts/SearchTrackingContext";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import { matchProductByName } from "@/lib/search/match-product";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import { useSearchHistory } from "@/hooks/useSearchHistory";

interface SearchResult {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  images?: string[];
  link: string;
  source: string;
  brand?: string;
  rating?: number;
  reviews?: number;
  // Enrichment fields
  estimatedMargin?: number;
  goldenScore?: number;
  goldenRank?: "S" | "A" | "B" | "C" | "D";
  trendPhase?: "emerging" | "growth" | "mature" | "declining";
  saturationLevel?: "unsaturated" | "low" | "moderate" | "saturated" | "hyper-saturated";
  competitionScore?: number;
  reviewVelocity?: number;
  priceStability?: number;
  supplyChainScore?: number;
  // Dedup fields
  platformCount?: number;
  platforms?: Array<{ platform: string; price: number | null; link: string; originalTitle: string; rating?: number; reviews?: number }>;
  bestPrice?: number | null;
  worstPrice?: number | null;
  priceSpread?: number;
  avgPrice?: number | null;
  bestPlatform?: string;
  // Rank fields
  relevanceScore?: number;
  rankReason?: string;
  [key: string]: unknown;
}

interface PlatformResult {
  platform: string;
  name: string;
  resultCount: number;
  data: unknown;
}

interface PlatformError {
  platform: string;
  name: string;
  error: string;
}

interface PlatformInfo {
  id: string;
  name: string;
  enabled: boolean;
  configured: boolean;
}

function normalizeResults(platform: string, data: unknown): SearchResult[] {
  const results: SearchResult[] = [];
  const sourceData = data as Record<string, unknown>;
  const items = Array.isArray(data)
    ? data
    : (sourceData?.search_results as unknown[]) ?? (sourceData?.data as unknown[]) ?? (sourceData?.products as unknown[]) ?? [];
  if (!Array.isArray(items)) return results;
  items.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const product = item as Record<string, unknown>;
    if (product.code && product.message && !product.title && !product.name) return;
    if ("code" in product && "message" in product && Object.keys(product).length <= 3) return;
    const price =
      typeof product.price === "number"
        ? product.price
        : typeof product.sellPrice === "number"
          ? product.sellPrice
          : typeof product.extracted_price === "number"
            ? product.extracted_price
            : null;
    const rawImages = product.images;
    const imagesArray = Array.isArray(rawImages)
      ? rawImages.map((img) => {
          if (typeof img === "string") return img;
          if (typeof img === "object" && img !== null) {
            const o = img as Record<string, unknown>;
            return String(o.link || o.url || o.large || o.high_res || o.thumbnail || "");
          }
          return "";
        }).filter((u) => u && u !== "null" && u !== "")
      : undefined;

    const primaryImage = (() => {
      const raw = product.image || product.thumbnail || product.imageUrl || product.productImage || "";
      const s = String(raw);
      return s && s !== "null" && s !== "undefined" ? s : null;
    })();
    const allImages = imagesArray && imagesArray.length > 0 ? imagesArray : (primaryImage ? [primaryImage] : undefined);

    results.push({
      id: `${platform}-${encodeURIComponent(String(product.link || product.itemWebUrl || product.url || product.product_link || "")).slice(0, 80)}-${i}`,
      title: String(product.title || product.productName || product.name || "Product"),
      price,
      image: primaryImage,
      images: allImages && allImages.length > 0 ? allImages : undefined,
      link: String(product.link || product.itemWebUrl || product.url || product.product_link || "#"),
      source: platform,
      brand: typeof product.brand === "string" && product.brand ? String(product.brand) : undefined,
      rating: typeof product.rating === "number" ? product.rating : undefined,
      reviews: typeof product.reviews === "number" ? product.reviews : typeof product.total_ratings === "number" ? product.total_ratings : undefined,
    });
  });
  return results;
}

const DEFAULT_FILTERS: Filters = {
  brands: [], priceMin: "", priceMax: "", minRating: 0,
  minMargin: 0, competitionLevel: [], trendingDirection: [], platformFilter: [],
};

// Filter/sort query params the products page reads and writes. Only
// non-default values are serialized so shared URLs stay short.
const FILTER_PARAM_KEYS = [
  "minPrice", "maxPrice", "minRating", "minMargin",
  "brand", "platform", "competition", "trend", "sort",
] as const;

const SORT_VALUES = [
  "relevance", "price-asc", "price-desc", "rating", "reviews", "margin", "golden",
] as const;
type SortValue = (typeof SORT_VALUES)[number];

function isSortValue(v: string | null): v is SortValue {
  return v !== null && (SORT_VALUES as readonly string[]).includes(v);
}

// Deterministic serialization of the current filter/sort state — used both to
// write params into the URL and to detect whether the state changed.
function buildFilterParams(filters: Filters, sortBy: string): string {
  const p = new URLSearchParams();
  if (filters.priceMin) p.set("minPrice", filters.priceMin);
  if (filters.priceMax) p.set("maxPrice", filters.priceMax);
  if (filters.minRating > 0) p.set("minRating", String(filters.minRating));
  if (filters.minMargin > 0) p.set("minMargin", String(filters.minMargin));
  filters.brands.forEach((b) => p.append("brand", b));
  filters.platformFilter.forEach((pl) => p.append("platform", pl));
  filters.competitionLevel.forEach((c) => p.append("competition", c));
  filters.trendingDirection.forEach((t) => p.append("trend", t));
  if (sortBy !== "relevance") p.set("sort", sortBy);
  return p.toString();
}

// Deterministic serialization of whatever filter/sort params a URL carries —
// always built in the same key order as buildFilterParams so the strings are
// directly comparable.
function pickFilterParams(params: URLSearchParams): string {
  const p = new URLSearchParams();
  const minPrice = params.get("minPrice");
  const maxPrice = params.get("maxPrice");
  const minRating = params.get("minRating");
  const minMargin = params.get("minMargin");
  if (minPrice) p.set("minPrice", minPrice);
  if (maxPrice) p.set("maxPrice", maxPrice);
  if (minRating) p.set("minRating", minRating);
  if (minMargin) p.set("minMargin", minMargin);
  params.getAll("brand").forEach((b) => p.append("brand", b));
  params.getAll("platform").forEach((pl) => p.append("platform", pl));
  params.getAll("competition").forEach((c) => p.append("competition", c));
  params.getAll("trend").forEach((t) => p.append("trend", t));
  const sort = params.get("sort");
  if (sort && sort !== "relevance" && isSortValue(sort)) p.set("sort", sort);
  return p.toString();
}

export default function ProductsPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<div className="max-w-7xl mx-auto p-4 md:p-8 text-center text-muted-foreground">Loading...</div>}>
        <ProductsContent />
      </Suspense>
    </PageErrorBoundary>
  );
}

const DEFAULT_PLATFORMS: PlatformInfo[] = [
  { id: "amazon", name: "Amazon", enabled: true, configured: true },
  { id: "ebay", name: "Ebay", enabled: true, configured: true },
  { id: "aliexpress", name: "Aliexpress", enabled: true, configured: true },
  { id: "cj", name: "CJ", enabled: true, configured: true },
  { id: "google_shopping", name: "Google Shopping", enabled: true, configured: true },
  { id: "walmart", name: "Walmart", enabled: true, configured: true },
  { id: "etsy", name: "Etsy", enabled: true, configured: true },
  { id: "temu", name: "Temu", enabled: true, configured: true },
  { id: "shein", name: "Shein", enabled: true, configured: true },
  { id: "banggood", name: "Banggood", enabled: true, configured: true },
  { id: "dhgate", name: "DHgate", enabled: true, configured: true },
  { id: "alibaba", name: "Alibaba", enabled: true, configured: true },
];

// Display names for platform ids that may not be in DEFAULT_PLATFORMS.
const PLATFORM_NAME_FALLBACK: Record<string, string> = {
  amazon: "Amazon",
  ebay: "Ebay",
  aliexpress: "Aliexpress",
  cj: "CJ",
  google_shopping: "Google Shopping",
  walmart: "Walmart",
  etsy: "Etsy",
  temu: "Temu",
  shein: "Shein",
  banggood: "Banggood",
  dhgate: "DHgate",
  alibaba: "Alibaba",
  keepa: "Keepa",
};

const PAGE_SIZE = 24;

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get("q") || "";
  const cacheRef = useRef({ query: "", results: [] as SearchResult[], platformResults: [] as PlatformResult[], platformErrors: [] as PlatformError[] });
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [platformResults, setPlatformResults] = useState<PlatformResult[]>([]);
  const [platformErrors, setPlatformErrors] = useState<PlatformError[]>([]);
  // True when at least one requested platform didn't return usable results —
  // shown as a soft warning so users know the list may be incomplete.
  const [platformTruncated, setPlatformTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<PlatformInfo[]>([]);
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "rating" | "reviews" | "margin" | "golden">("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const { user } = useAuth();
  const { trackSearch } = useSearchTracking();
  const searchAbortRef = useRef<AbortController | null>(null);
  const imageFetchAbortRef = useRef<AbortController | null>(null);
  const { history, addSearch, markProductClicked, getInterestProfile, getSmartRecommendations, clearHistory } = useSearchHistory();

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) return {};
    try {
      const token = await user.getIdToken();
      return { Authorization: `Bearer ${token}` };
    } catch {
      return {};
    }
  }, [user]);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  // Compare items handed over via URL (?compare=<name>&compare=<name>), e.g.
  // from the dashboard's QuickCompareBar. Matched once results arrive.
  const pendingCompareNames = useRef<{ names: string[]; applied: boolean }>({ names: [], applied: false });

  // Product selection for Quick AI Actions (independent per card)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Platform progress tracking
  const [platformProgress, setPlatformProgress] = useState<{
    platforms: { platform: string; name: string; status: "pending" | "loading" | "success" | "error"; resultCount?: number; error?: string }[];
  }>({ platforms: [] });

  // Search Alert modal (Feature 10)
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Pagination — keep the DOM light for large result sets; users can load more
  // in batches instead of rendering hundreds of cards at once.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [results, filters, sortBy]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("recentSearches") || "[]");
      if (Array.isArray(stored)) setRecentSearches(stored);
    } catch {
      // ignore malformed local storage
    }
  }, []);

  // Escape closes the filters drawer/panel — expected behavior for the
  // mobile bottom sheet and a convenience on desktop.
  useEffect(() => {
    if (!showFilters) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFilters(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showFilters]);

  const saveRecentSearch = useCallback((q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  }, [recentSearches]);

  const handleSearch = useCallback(async (searchQuery?: string, platformsOverride?: string[], parsedIntent?: import("@/lib/search/intent-parser").ParsedIntent) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    searchAbortRef.current?.abort();
    imageFetchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const platforms = platformsOverride ?? selectedPlatforms;
    const platformKey = [...platforms].sort().join(",") || "all";
    // Bumped when the cached payload shape changes, so stale cache entries
    // from an older build can't be restored with missing/renamed fields.
    const cacheKey = `search_v2_${platformKey}_${q}`;

    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
      if (cached && cached.query === q && cached.results?.length > 0) {
        const cleanResults = cached.results.filter((r: Record<string, unknown>) => {
          if (!r || typeof r !== "object") return false;
          if (r.code && r.message && !r.title && !r.name) return false;
          if ("code" in r && "message" in r && Object.keys(r).length <= 3) return false;
          return true;
        });
        setResults(cleanResults);
        setPlatformResults(cached.platformResults || []);
        setPlatformErrors([]);
        setPlatformTruncated(false);
        setSearched(true);
        setLoading(false);
        setQuery(q);
        cacheRef.current = { query: q, results: cleanResults, platformResults: cached.platformResults || [], platformErrors: [] };
        return;
      }
    } catch {
      // cache unavailable — continue with a live search
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setPlatformResults([]);
    setPlatformErrors([]);
    setPlatformTruncated(false);
    setSearched(true);
    setQuery(q);
    setVisibleCount(PAGE_SIZE);
    saveRecentSearch(q);

    // Sync the active search into the URL so results are shareable and
    // survive a refresh. Preserve any existing command params (compare,
    // maxPrice, minMargin) instead of wiping them out.
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("q", q);
    router.replace(`/products?${nextParams.toString()}`);

    // Initialize platform progress — resolve display names (from the API's
    // platform list, a static fallback, or a humanized id) instead of showing
    // raw platform ids in the status bar.
    const activePlatforms = platforms.length > 0
      ? platforms.map((p) => ({
          platform: p,
          name: availablePlatforms.find((ap) => ap.id === p)?.name ||
            PLATFORM_NAME_FALLBACK[p] ||
            p.replace(/_/g, " "),
          status: "loading" as const,
        }))
      : DEFAULT_PLATFORMS.map((p) => ({ platform: p.id, name: p.name, status: "loading" as const }));
    setPlatformProgress({ platforms: activePlatforms });

    try {
      const authHeaders = await getAuthHeaders();
      const requestBody: Record<string, unknown> = {
        query: q,
        platforms: platforms.length > 0 ? platforms : undefined,
        // Full (non-streaming) response — the enrichment pipeline runs on the
        // complete merged payload, so streaming mode is intentionally off.
        stream: false,
      };
      if (parsedIntent) requestBody.intent = parsedIntent;

      // Fetch the full enriched results for the enhancement pipeline
      const data = await safeFetch<{
        platforms?: PlatformResult[];
        platformErrors?: PlatformError[];
        mergedProducts?: SearchResult[];
        intent?: Record<string, unknown>;
        filters?: Record<string, unknown>;
      }>("/api/platforms/search-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      // Use merged/enriched products if available (Features 1-4)
      let allResults: SearchResult[];
      if (data.mergedProducts && data.mergedProducts.length > 0) {
        allResults = data.mergedProducts;
      } else {
        // Fallback: normalize from raw platform results
        allResults = [];
        const platformData = data.platforms || [];
        platformData.forEach((p: PlatformResult) => {
          allResults.push(...normalizeResults(p.platform, p.data));
        });
      }

      const errs = data.platformErrors || [];

      // Apply intent-based filters if available (Feature 2)
      if (data.filters) {
        const f = data.filters as Record<string, unknown>;
        setFilters((prev) => ({
          ...prev,
          brands: Array.isArray(f.brands) && f.brands.length > 0 ? f.brands as string[] : prev.brands,
          priceMin: f.priceMin ? String(f.priceMin) : prev.priceMin,
          priceMax: f.priceMax ? String(f.priceMax) : prev.priceMax,
          minRating: typeof f.minRating === "number" ? f.minRating : prev.minRating,
          platformFilter: Array.isArray(f.platformFilter) && f.platformFilter.length > 0 ? f.platformFilter as string[] : prev.platformFilter,
          trendingDirection: Array.isArray(f.trendingDirection) && f.trendingDirection.length > 0 ? f.trendingDirection as ("rising" | "stable" | "declining")[] : prev.trendingDirection,
        }));
      }

      // Update platform progress — over the platforms that were actually
      // requested, so a user-selected subset isn't padded with unrelated
      // platforms shown as "success, 0 results".
      const platformData = data.platforms || [];
      const progressList = activePlatforms.map((requested) => {
        const pd = platformData.find((pr: PlatformResult) => pr.platform === requested.platform);
        const err = errs.find((e: PlatformError) => e.platform === requested.platform);
        if (err) return { ...requested, status: "error" as const, error: err.error };
        if (pd) return { ...requested, status: "success" as const, resultCount: pd.resultCount };
        // Requested but absent from the response entirely — that's an error
        // (most often an aborted/overloaded request), not a zero-result query.
        return { ...requested, status: "error" as const, error: "No response from platform" };
      });
      setPlatformProgress({ platforms: progressList });
      const truncated = progressList.some((p) => p.status === "error");
      setPlatformTruncated(truncated);

      setPlatformResults(platformData);
      setPlatformErrors(errs);
      setResults(allResults);
      addSearch(q, allResults, selectedPlatforms.length > 0 ? selectedPlatforms : availablePlatforms.map((p) => p.id));
      cacheRef.current = { query: q, results: allResults, platformResults: platformData, platformErrors: errs };
      try {
        // Cap what we persist: full result sets can blow past the ~5MB
        // sessionStorage quota, which would make the write (and the alert
        // modal that shares this storage) fail silently.
        const cachedResults = allResults.slice(0, 60);
        sessionStorage.setItem(cacheKey, JSON.stringify({
          query: q,
          results: cachedResults,
          platformResults: platformData.slice(0, 10),
        }));
      } catch {
        // sessionStorage full or unavailable — results still render in memory
      }

      // Feature 6: Save search to Firestore for personalization
      if (user) {
        try {
          const token = await user.getIdToken();
          await safeFetch("/api/search-history", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ query: q, source: "products", resultCount: allResults.length }),
          });
        } catch { /* silently ignore */ }
      }

      // Feature 6: Track search event
      trackSearch(q, allResults.length);

      // Background image fetching — the API echoes the exact urls it resolved
      // (`imgData.urls`), so images are matched by URL instead of array index.
      const missingImages = allResults.filter((r) => !r.image && r.link && r.link !== "#");
      if (missingImages.length > 0) {
        const imageController = new AbortController();
        imageFetchAbortRef.current = imageController;
        const urlsToFetch = missingImages.map((r) => r.link);
        const authHeaders2 = await getAuthHeaders();
        safeFetch<{ images?: (string | undefined)[]; urls?: string[] }>("/api/platforms/batch-images", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders2 },
          body: JSON.stringify({ urls: urlsToFetch }),
          signal: imageController.signal,
        })
          .then((imgData) => {
            if (!imgData.images) return;
            // Build a url→image map when the API echoes the request order;
            // otherwise fall back to positional alignment (legacy behavior).
            const byUrl = new Map<string, string | undefined>();
            if (imgData.urls) {
              imgData.urls.forEach((url: string, i: number) => byUrl.set(url, imgData.images?.[i]));
            }
            setResults((prev) => {
              const currentQuery = cacheRef.current.query;
              if (currentQuery !== q) return prev;
              const updated = prev.map((item) => {
                if (item.image) return item;
                const matched = byUrl.size > 0 ? byUrl.get(item.link) : imgData.images?.[missingImages.findIndex((m) => m.link === item.link)];
                if (matched) return { ...item, image: matched };
                return item;
              });
              cacheRef.current = { ...cacheRef.current, results: updated };
              try {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                  query: q,
                  results: updated.slice(0, 60),
                  platformResults: platformData.slice(0, 10),
                }));
              } catch {
                // sessionStorage unavailable — in-memory results still work
              }
              return updated;
            });
          })
          .catch(() => {
          // Image enrichment is best-effort; don't retry or surface
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Network error - please try again");
    } finally {
      setLoading(false);
    }
  }, [query, selectedPlatforms, getAuthHeaders, saveRecentSearch, trackSearch, user, router, searchParams, availablePlatforms]);

  const initialSearchDone = useRef(false);

  // Restore last search results from history on mount
  useEffect(() => {
    if (initialSearchDone.current) return;
    if (searchParams.get("q")) return; // URL query takes priority
    if (history.length === 0) return;

    const lastSearch = history[0];
    if (lastSearch && lastSearch.results.length > 0) {
      initialSearchDone.current = true;
      setQuery(lastSearch.query);
      setResults(lastSearch.results as SearchResult[]);
      setPlatformResults([]);
      setPlatformErrors([]);
      setPlatformTruncated(false);
      setSearched(true);
      if (lastSearch.platforms.length > 0) {
        setSelectedPlatforms(lastSearch.platforms);
      }
    }
  }, [history, searchParams]);

  const lastSearchParam = useRef<string | null>(null);
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q) return;
    if (q === lastSearchParam.current && initialSearchDone.current) return;
    lastSearchParam.current = q;
    initialSearchDone.current = true;
    if (cacheRef.current.query === q && cacheRef.current.results.length > 0) {
      setSearched(true);
      setQuery(q);
      return;
    }
    handleSearch(q);
  }, [searchParams, handleSearch]);

  // Consume the ?compare= names from the dashboard's QuickCompareBar. The
  // products are not loaded yet, so record the request and activate compare
  // mode; the matches are applied below once results resolve.
  useEffect(() => {
    const names = searchParams.getAll("compare") || [];
    if (names.length === 0) return;
    pendingCompareNames.current = { names, applied: false };
    setCompareMode(true);
  }, [searchParams]);

  // Apply the requested compare names against the resolved result set (capped
  // at 4 like the compare bar). Retries on each results change until at least
  // one match lands, so a slow search still hands the products over.
  useEffect(() => {
    const pending = pendingCompareNames.current;
    if (pending.applied || pending.names.length === 0 || results.length === 0) return;
    const ids = pending.names
      .map((name) => matchProductByName(results, name))
      .filter((id): id is string => id !== null)
      .slice(0, 4);
    if (ids.length === 0) return;
    pending.applied = true;
    setSelectedForCompare(ids);
  }, [results]);

  // Read URL filter/sort params (?maxPrice=30&minMargin=60&sort=price-asc…)
  // so deep links and the dashboard's smart-search chips land on the
  // promised, filtered view. Merge-only: params that are absent leave the
  // current state untouched.
  useEffect(() => {
    const sort = searchParams.get("sort");
    if (isSortValue(sort)) setSortBy(sort);
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minRating = searchParams.get("minRating");
    const minMargin = searchParams.get("minMargin");
    const brands = searchParams.getAll("brand");
    const platforms = searchParams.getAll("platform");
    const competition = searchParams
      .getAll("competition")
      .filter((c): c is "low" | "medium" | "high" => c === "low" || c === "medium" || c === "high");
    const trend = searchParams
      .getAll("trend")
      .filter((t): t is "rising" | "stable" | "declining" => t === "rising" || t === "stable" || t === "declining");
    if (!minPrice && !maxPrice && !minRating && !minMargin && brands.length === 0 && platforms.length === 0 && competition.length === 0 && trend.length === 0) return;
    setFilters((prev) => ({
      ...prev,
      priceMin: minPrice || prev.priceMin,
      priceMax: maxPrice || prev.priceMax,
      minRating: minRating ? Number(minRating) : prev.minRating,
      minMargin: minMargin ? Number(minMargin) : prev.minMargin,
      brands: brands.length > 0 ? brands : prev.brands,
      platformFilter: platforms.length > 0 ? platforms : prev.platformFilter,
      competitionLevel: competition.length > 0 ? competition : prev.competitionLevel,
      trendingDirection: trend.length > 0 ? trend : prev.trendingDirection,
    }));
  }, [searchParams]);

  // Write the active filters + sort back into the URL so a filtered view is
  // shareable and survives a refresh. Only non-default params are written and
  // unrelated params (q, compare) are preserved. The guards keep this
  // idempotent: the first pass adopts the URL as-is (so deep links aren't
  // wiped while the read effect catches state up), later passes write only
  // when the filter state genuinely changed.
  const syncedUrlFilterParamsRef = useRef<string | null>(null);
  const syncedStateFilterParamsRef = useRef<string | null>(null);
  useEffect(() => {
    const urlParams = pickFilterParams(searchParams);
    const stateParams = buildFilterParams(filters, sortBy);
    if (syncedUrlFilterParamsRef.current === null) {
      syncedUrlFilterParamsRef.current = urlParams;
      return;
    }
    const urlChanged = urlParams !== syncedUrlFilterParamsRef.current;
    syncedUrlFilterParamsRef.current = urlParams;
    if (urlChanged) {
      // External navigation (back/forward or hand-edited URL) — the URL wins
      // and the read effect above applies it to the state.
      syncedStateFilterParamsRef.current = urlParams;
      return;
    }
    if (stateParams === urlParams) {
      syncedStateFilterParamsRef.current = stateParams;
      return;
    }
    if (stateParams === syncedStateFilterParamsRef.current) return; // already written
    syncedStateFilterParamsRef.current = stateParams;
    const next = new URLSearchParams(searchParams.toString());
    FILTER_PARAM_KEYS.forEach((key) => next.delete(key));
    const q = searchParams.get("q") || query.trim();
    if (q) next.set("q", q);
    new URLSearchParams(stateParams).forEach((value, key) => next.append(key, value));
    router.replace(`/products?${next.toString()}`);
  }, [filters, sortBy, query, searchParams, router]);

  const { data: platformData } = useAPI<{ platforms?: PlatformInfo[] }>("/api/platforms/search-all");
  useEffect(() => {
    if (platformData?.platforms) {
      const list = platformData.platforms.filter((p: PlatformInfo) => p.enabled && p.configured).map((p: PlatformInfo) => ({ id: p.id, name: p.name, enabled: true, configured: true }));
      if (list.length > 0) setAvailablePlatforms(list);
      setSelectedPlatforms(prev => prev.filter(id => list.some(p => p.id === id)));
    }
  }, [platformData]);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const sortedResults = useMemo(() => {
    const sorted = [...results];
    switch (sortBy) {
    case "price-asc":
        return [...sorted].sort((a, b) => {
          const pa = a.price;
          const pb = b.price;
          // Missing prices always sort last, regardless of direction
          if (pa == null && pb == null) return 0;
          if (pa == null) return 1;
          if (pb == null) return -1;
          return pa - pb;
        });
      case "price-desc":
        return [...sorted].sort((a, b) => {
          const pa = a.price;
          const pb = b.price;
          if (pa == null && pb == null) return 0;
          if (pa == null) return 1;
          if (pb == null) return -1;
          return pb - pa;
        });
      case "rating":
        return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case "reviews":
        return sorted.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
      case "margin":
        return sorted.sort((a, b) => (b.estimatedMargin ?? 0) - (a.estimatedMargin ?? 0));
      case "golden": {
        const rankOrder: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
        return sorted.sort((a, b) => (rankOrder[b.goldenRank || "D"] ?? 0) - (rankOrder[a.goldenRank || "D"] ?? 0));
      }
      default:
        return sorted;
    }
  }, [results, sortBy]);

  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>();
    results.forEach((r) => {
      if (r.brand) brandSet.add(r.brand);
    });
    return Array.from(brandSet);
  }, [results]);

  const availableResultPlatforms = useMemo(() => {
    const platformSet = new Set<string>();
    results.forEach((r) => platformSet.add(r.source));
    return Array.from(platformSet);
  }, [results]);

  // Count of individually active filter constraints — surfaced on the Filters
  // toggle buttons so users can see at a glance that filters are narrowing results.
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.brands.length > 0) count += filters.brands.length;
    if (filters.priceMin) count += 1;
    if (filters.priceMax) count += 1;
    if (filters.minRating > 0) count += 1;
    if (filters.minMargin > 0) count += 1;
    if (filters.competitionLevel.length > 0) count += filters.competitionLevel.length;
    if (filters.trendingDirection.length > 0) count += filters.trendingDirection.length;
    if (filters.platformFilter.length > 0) count += filters.platformFilter.length;
    return count;
  }, [filters]);

  const filteredResults = useMemo(() => {
    return sortedResults.filter((r) => {
      if (filters.brands.length > 0 && (!r.brand || !filters.brands.includes(r.brand))) return false;
      if (filters.priceMin && (r.price == null || r.price < Number(filters.priceMin))) return false;
      if (filters.priceMax && (r.price == null || r.price > Number(filters.priceMax))) return false;
      if (filters.minRating > 0 && (r.rating == null || r.rating < filters.minRating)) return false;
      if (filters.platformFilter.length > 0 && !filters.platformFilter.includes(r.source)) return false;
      // Enrichment-based filters (Feature 7)
      if (filters.minMargin > 0 && (r.estimatedMargin == null || r.estimatedMargin < filters.minMargin)) return false;
      if (filters.competitionLevel.length > 0) {
        const compScore = r.competitionScore ?? 50;
        const compLevel: "low" | "medium" | "high" = compScore < 40 ? "low" : compScore > 70 ? "high" : "medium";
        if (!filters.competitionLevel.includes(compLevel)) return false;
      }
      if (filters.trendingDirection.length > 0) {
        const phase = r.trendPhase || "growth";
        const dirMap: Record<string, string> = { emerging: "rising", growth: "rising", mature: "stable", declining: "declining" };
        const dir = dirMap[phase] || "stable";
        if (!filters.trendingDirection.includes(dir as "rising" | "stable" | "declining")) return false;
      }
      return true;
    });
  }, [sortedResults, filters]);

  const visibleResults = filteredResults.slice(0, visibleCount);
  const hasMore = filteredResults.length > visibleCount;

  // Compare mode handlers
  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (compareMode) setSelectedForCompare([]);
  };

  const toggleProductSelect = (id: string) => {
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const getSelectedProducts = () => results.filter((r) => selectedForCompare.includes(r.id));

  // Product selection for Quick AI Actions (independent toggle per card)
  const selectProduct = useCallback((id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const getSelectedProduct = useCallback(() => {
    // Return the last selected product for Quick Actions
    if (selectedProductIds.length === 0) return null;
    return results.find((r) => r.id === selectedProductIds[selectedProductIds.length - 1]) || null;
  }, [results, selectedProductIds]);

  const handleProductClick = useCallback((product: Record<string, unknown>) => {
    markProductClicked((product.id as string) || (product.title as string));
  }, [markProductClicked]);

  // AI action handler
  const handleAIAction = useCallback((action: string, product: EnrichedProduct) => {
    if (action === "validate") {
      const params = new URLSearchParams();
      if (product.title) params.set("productTitle", product.title);
      if (product.price != null) params.set("currentPrice", String(product.price));
      if (product.image) params.set("productImage", product.image);
      if (product.link) params.set("productUrl", product.link);
      if (product.source) params.set("category", product.source);
      if (product.brand) params.set("brand", product.brand);
      if (product.rating != null) params.set("rating", String(product.rating));
      if (product.reviews != null) params.set("reviews", String(product.reviews));
      if (product.bestPrice != null) params.set("bestPrice", String(product.bestPrice));
      if (product.platforms && product.platforms.length > 0) {
        params.set("platformPrices", JSON.stringify(product.platforms.slice(0, 5)));
      }
      if (product.competitorCount != null) params.set("competitorCount", String(product.competitorCount));
      if (product.estimatedMargin != null) params.set("estimatedMargin", String(product.estimatedMargin));
      if (product.goldenScore != null) params.set("existingGoldenScore", String(product.goldenScore));
      if (product.trendPhase) params.set("trendPhase", product.trendPhase);
      if (product.saturationLevel) params.set("saturationLevel", product.saturationLevel);
      window.open(`/product-validation?${params.toString()}`, "_blank");
      return;
    }
    const prompts: Record<string, string> = {
      analyze: `Analyze this product for dropshipping viability: "${product.title}" priced at $${product.price || "unknown"} on ${product.source}. Check market demand, competition, profit potential, and give recommendations.`,
      suppliers: `Find the best suppliers for "${product.title}" - compare pricing, shipping times, and reliability across CJ Dropshipping, AliExpress, and other platforms.`,
      listing: `Generate an optimized product listing for "${product.title}" - include title, description, bullet points, and SEO tags for my dropshipping store.`,
    };
    const prompt = prompts[action] || `Analyze "${product.title}" for my dropshipping store.`;
    window.open(`/ai?q=${encodeURIComponent(prompt)}`, "_blank");
  }, []);

  // AI Ask handler (Feature 2: local rule-based intent parsing)
  const handleAskAI = useCallback(async (naturalLanguageQuery: string) => {
    try {
      // Use local intent parser for instant structured extraction
      const { parseIntentLocally, buildSearchKeywords, applyIntentToFilters } = await import("@/lib/search/intent-parser");
      const intent = parseIntentLocally(naturalLanguageQuery);
      const searchQ = buildSearchKeywords(intent).join(" ") || naturalLanguageQuery;

      // Apply parsed intent as filters
      const parsedFilters = applyIntentToFilters(intent);
      setFilters((prev) => ({
        ...prev,
        brands: parsedFilters.brands.length > 0 ? parsedFilters.brands : prev.brands,
        priceMin: parsedFilters.priceMin || prev.priceMin,
        priceMax: parsedFilters.priceMax || prev.priceMax,
        minRating: parsedFilters.minRating > 0 ? parsedFilters.minRating : prev.minRating,
        platformFilter: parsedFilters.platformFilter.length > 0 ? parsedFilters.platformFilter : prev.platformFilter,
        trendingDirection: parsedFilters.trendingDirection.length > 0 ? parsedFilters.trendingDirection : prev.trendingDirection,
      }));

      setQuery(searchQ);
      await handleSearch(searchQ, undefined, intent);
    } catch {
      // Fallback to simple regex parsing
      const parsedQuery = naturalLanguageQuery
        .replace(/under\s*\$?\d+/gi, "")
        .replace(/\d+\s*\+?\s*stars?/gi, "")
        .replace(/on\s+(amazon|ebay|aliexpress|walmart|etsy)/gi, "")
        .replace(/trending|popular|best|good|great|high|low|cheap|expensive/gi, "")
        .trim()
        .replace(/\s+/g, " ");
      const searchQ = parsedQuery.length > 3 ? parsedQuery : naturalLanguageQuery;
      setQuery(searchQ);
      await handleSearch(searchQ);
    }
  }, [handleSearch]);

  // Quick action handler
  const handleQuickAction = useCallback(async (prompt: string) => {
    window.open(`/ai?q=${encodeURIComponent(prompt)}`, "_blank");
  }, []);

  // Search Alert handler (Feature 10)
  const handleCreateAlert = useCallback(async (alertData: SearchAlertData) => {
    if (!user) throw new Error("You must be signed in to create an alert");
    const token = await user.getIdToken();
    const res = await safeFetch<{ success?: boolean; alert?: unknown; error?: string }>("/api/search/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(alertData),
    });
    if (!res.alert && res.error) throw new Error(res.error);
  }, [user]);

  return (
    <main id="products-main" aria-label="Products" className="max-w-7xl mx-auto space-y-5 md:space-y-6 pb-16 md:pb-24">
      <a
        href="#products-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-gray-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to main content
      </a>
      <SearchHeader
        query={query}
        setQuery={setQuery}
        onSearch={(platformsOverride) => handleSearch(undefined, platformsOverride)}
        loading={loading}
        platforms={availablePlatforms}
        selectedPlatforms={selectedPlatforms}
        togglePlatform={togglePlatform}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        recentSearches={recentSearches}
        onRecentClick={(q) => handleSearch(q)}
        onAskAI={handleAskAI}
      />

      {error && (
        <div className="glass rounded-2xl p-4 border border-red-400/20 bg-red-400/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Search Alert Modal (Feature 10) */}
      {query && (
        <SearchAlertModal
          query={query}
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          onCreateAlert={handleCreateAlert}
        />
      )}

      {/* Filters — inline panel on desktop, bottom-sheet drawer on mobile.
          Toggled from SearchHeader (pre-search) and ResultsHeader (post-search). */}
      {showFilters && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setShowFilters(false)}
            aria-hidden="true"
          />
          <div
            id="products-filters"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-background p-4 pb-8 shadow-2xl md:static md:z-auto md:max-h-none md:overflow-visible md:rounded-2xl md:border md:bg-transparent md:p-0 md:shadow-none"
          >
            <div className="flex items-center justify-between mb-3 md:hidden">
              <span className="text-sm font-semibold text-foreground">Filters</span>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
                className="p-2.5 -mr-2 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center min-h-[44px] min-w-[44px]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              availableBrands={availableBrands}
              resultCount={results.length}
              filteredCount={filteredResults.length}
              availablePlatforms={availableResultPlatforms}
            />
          </div>
        </>
      )}

      {/* Compare mode counter */}
      {compareMode && selectedForCompare.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {selectedForCompare.length}/4 selected
          </span>
        </div>
      )}

      {/* Compare panel */}
      {compareMode && selectedForCompare.length > 0 && (
        <ComparePanel
          selectedProducts={getSelectedProducts()}
          onRemove={toggleProductSelect}
          onClearAll={() => setSelectedForCompare([])}
          onAICompare={(products) => {
            const prompt = `Compare these products for dropshipping: ${products.map((p) => `"${p.title}" ($${p.price || "N/A"} on ${p.source})`).join(", ")}. Which is the best to sell and why?`;
            window.open(`/ai?q=${encodeURIComponent(prompt)}`, "_blank");
          }}
        />
      )}

      {/* Platform progress */}
      {loading && platformProgress.platforms.length > 0 && (
        <PlatformProgress platforms={platformProgress.platforms} />
      )}

      {/* Incomplete results warning — some platforms didn't respond, so the
          list may be missing products; shown after loading completes. */}
      {!loading && platformTruncated && platformProgress.platforms.length > 0 && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            Some platforms didn&apos;t respond — results may be incomplete.
          </span>
        </div>
      )}

      {!loading && searched && (
        <ResultsHeader
          resultCount={filteredResults.length}
          platformCount={platformResults.length}
          sortBy={sortBy}
          setSortBy={setSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((v) => !v)}
          activeFilterCount={activeFilterCount}
        />
      )}

      {platformErrors.length > 0 && (
        <div className="glass rounded-2xl p-3 border border-amber-400/20 bg-amber-400/5">
          <p className="text-xs font-medium text-amber-400 mb-1.5">
            {platformErrors.length} platform{platformErrors.length !== 1 ? "s" : ""} returned no results:
          </p>
          <div className="space-y-1">
            {platformErrors.map((pe) => (
              <div key={pe.platform} className="flex items-center gap-2 text-[10px] text-amber-400/80">
                <span className="font-medium">{pe.name}</span>
                {pe.error && <span className="text-amber-400/50">— {pe.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick action chips */}
      {!loading && searched && results.length > 0 && (
        <QuickActionChips
          query={query}
          onAction={handleQuickAction}
          hasResults={results.length > 0}
          compareMode={compareMode}
          toggleCompareMode={toggleCompareMode}
          onCreateAlert={() => setShowAlertModal(true)}
          selectedProduct={getSelectedProduct()}
        />
      )}

      {/* Bulk actions for card-selected products (Export CSV / Push to Store) */}
      {!loading && searched && results.length > 0 && (
        <BulkActionsBar
          selectedIds={results.filter((r) => selectedProductIds.includes(r.id)).map((r) => r.id)}
          selectedProducts={results
            .filter((r) => selectedProductIds.includes(r.id))
            .map((r) => ({ id: r.id, title: r.title, price: r.price, source: r.source, image: r.image }))}
          onClearSelection={() => setSelectedProductIds([])}
          onSelectAll={() => setSelectedProductIds((prev) => Array.from(new Set([...prev, ...filteredResults.map((r) => r.id)])))}
          totalResults={filteredResults.length}
        />
      )}

      {!loading && searched && results.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleResults.map((product, i) => (
                <EnrichedProductCard
                  key={`${product.id}-${i}`}
                  product={product}
                  index={i}
                  compareMode={compareMode}
                  selected={selectedForCompare.includes(product.id)}
                  onToggleSelect={toggleProductSelect}
                  onAIAction={handleAIAction}
                  onProductClick={handleProductClick}
                  selectedForActions={selectedProductIds.includes(product.id)}
                  onSelectForActions={selectProduct}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleResults.map((product, i) => (
                <ListItemCard
                  key={`${product.id}-${i}`}
                  product={product}
                  index={i}
                  onProductClick={handleProductClick}
                  selectedForActions={selectedProductIds.includes(product.id)}
                  onSelectForActions={selectProduct}
                />
              ))}
            </div>
          )}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount((c) => Math.min(filteredResults.length, c + PAGE_SIZE))}
                className="text-xs px-5 py-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
              >
                Load more ({filteredResults.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {!loading && searched && results.length > 0 && filteredResults.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No products match your filters</h3>
          <p className="text-sm text-muted-foreground mb-4">Try adjusting or clearing some filters</p>
          <button
            onClick={() => setFilters({
              brands: [], priceMin: "", priceMax: "", minRating: 0,
              minMargin: 0, competitionLevel: [], trendingDirection: [], platformFilter: [],
            })}
            className="text-xs px-4 py-2 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <ProductsEmptyState onAskAI={handleAskAI} />
      )}

      {!loading && !searched && history.length === 0 && (
        <>
          <div className="flex items-center gap-2 mb-2 pt-2">
            <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-semibold text-foreground">Discovery</span>
          </div>
          <PersonalizedRecommendations />
          <AICollections />
          <TrendingSection />
          <NichesSection />
          <CategoriesSection />
          <HowItWorksSection />
        </>
      )}

      {/* Recent searches + recommendations for returning visitors */}
      {!loading && !searched && history.length > 0 && (
        <SmartFeed
          history={history}
          smartRecommendations={getSmartRecommendations()}
          interestProfile={getInterestProfile()}
          onSearchRecent={(q) => { setQuery(q); void handleSearch(q); }}
          onClearHistory={clearHistory}
        />
      )}

      {/* Back to top button */}
      <BackToTopButton />
    </main>
  );
}
