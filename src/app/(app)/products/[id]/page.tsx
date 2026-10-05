"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft, ExternalLink, Star, ShoppingCart, Package,
  Shield, Clock, ChevronLeft, ChevronRight, Images, Barcode, Layers,
  Search, BarChart3, AlertTriangle, RefreshCw, ArrowUpRight,
  Activity, Calculator, DollarSign, FileText, Share2, ShieldCheck, Swords, TrendingUp, Truck,
} from "lucide-react";
import Image from "next/image";
import { useInView } from "@/hooks/useInView";
import PriceComparison from "@/components/products/PriceComparison";
import CrossPlatformImageMatches from "@/components/products/CrossPlatformImageMatches";
import ProfitCalculator from "@/components/products/ProfitCalculator";
import MarketIntelligence from "@/components/products/MarketIntelligence";
import ReviewIntelligence from "@/components/products/ReviewIntelligence";
import SupplierMatchSection from "@/components/products/SupplierMatch";
import SourcingSteps from "@/components/products/SourcingSteps";
import { SupplierPicker } from "@/components/fulfillment/SupplierPicker";
import { SupplierOffersTable } from "@/components/products/SupplierOffersTable";
import { PushToStoreButton } from "@/components/products/PushToStoreButton";
import ListingOptimization from "@/components/products/ListingOptimization";
import SimilarProducts from "@/components/products/SimilarProducts";
import ProductActionBar from "@/components/products/ProductActionBar";
import StickyProductBar from "@/components/products/StickyProductBar";
import PriceHistoryChart from "@/components/products/PriceHistoryChart";
import { productPriceKey, seriesForPlatform, type ProductPricePoint } from "@/lib/products/price-key";
import { stableProductId } from "@/lib/products/product-id";
import SectionSkeleton from "@/components/products/SectionSkeleton";
import { safeFetch } from "@/lib/safe-fetch";
import { useAPI } from "@/hooks/useAPI";
import { normalizeCJLink } from "@/lib/cj-url";
import { useAuth } from "@/components/auth/AuthProvider";
import { logger } from "@/lib/logger";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";

const platformIcons: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", keepa: "\ud83d\udcca",
  walmart: "\ud83c\udfea", temu: "\ud83d\udd25", shein: "\ud83d\udc57",
  etsy: "\ud83c\udfa8", alibaba: "\ud83c\udfed", banggood: "\u26a1", dhgate: "\ud83d\udd17",
};

const platformColors: Record<string, string> = {
  amazon: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  aliexpress: "bg-red-400/10 text-red-400 border-red-400/20",
  ebay: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  cj: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
};

const platformDotColors: Record<string, string> = {
  amazon: "bg-amber-400",
  aliexpress: "bg-red-400",
  ebay: "bg-blue-400",
  cj: "bg-emerald-400",
  google_shopping: "bg-blue-300",
  walmart: "bg-blue-500",
  temu: "bg-orange-400",
  shein: "bg-pink-400",
  etsy: "bg-orange-300",
  alibaba: "bg-yellow-400",
};

const defaultSuggestedSearches = [
  "wireless earbuds", "phone case", "led lights", "pet tracker",
  "kitchen gadget", "yoga mat", "back brace", "espresso maker",
];

export function buildProductUrl(link: string, source: string, title: string): string {
  if (link && link !== "#") return normalizeCJLink(link);
  const q = encodeURIComponent(title || "products");
  switch (source) {
    case "amazon":
      return `https://www.amazon.com/s?k=${q}`;
    case "ebay":
      return `https://www.ebay.com/sch/i.html?_nkw=${q}`;
    case "aliexpress":
      return `https://www.aliexpress.com/wholesale?SearchText=${q}`;
    case "walmart":
      return `https://www.walmart.com/search?q=${q}`;
    case "google_shopping":
      return `https://www.google.com/search?q=${q}&tbm=shop`;
    case "shein":
      return `https://us.shein.com/pdsearch/${q}/`;
    case "etsy":
      return `https://www.etsy.com/search?q=${q}`;
    case "alibaba":
      return `https://www.alibaba.com/trade/search?SearchText=${q}`;
    case "cj":
      return "https://www.cjdropshipping.com/";
    case "temu":
      return "https://www.temu.com/";
    case "dhgate":
      return `https://www.dhgate.com/wholesale/search.do?searchkey=${q}`;
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}

interface ProductData {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  images?: string[];
  link: string;
  source: string;
  rating?: number;
  reviews?: number;
  category?: string;
  tags?: string[];
  productId?: string;
  asin?: string;
}

function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % images.length);
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + images.length) % images.length);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [lightboxOpen]);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-surface flex items-center justify-center rounded-2xl border border-border">
        <Package className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground/20" />
      </div>
    );
  }

  return (
    <>
      <div className="hero-image-card">
        <div className="aspect-[4/3] sm:aspect-square bg-surface relative cursor-zoom-in" onClick={() => setLightboxOpen(true)}>
          <Image src={images[activeIndex]} alt={`${title} - Image ${activeIndex + 1}`} width={600} height={600} unoptimized className="w-full h-full object-contain p-6 hover:scale-110 transition-transform duration-500" />
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center border border-white/10">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center border border-white/10">
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-md border border-white/10">
                {activeIndex + 1} / {images.length}
              </span>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-1.5 p-3 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {images.map((img, i) => (
              <button key={i} onClick={() => setActiveIndex(i)} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${i === activeIndex ? "border-accent shadow-[0_0_12px_rgba(var(--glow-color),0.3)]" : "border-transparent opacity-50 hover:opacity-90"}`}>
                <Image src={img} alt={`${title} thumbnail ${i + 1}`} width={56} height={56} unoptimized className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center border border-white/10">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <Image src={images[activeIndex]} alt={title} width={1200} height={900} unoptimized className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center border border-white/10">
            <ChevronRight className="h-6 w-6" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-white/10 text-white text-sm backdrop-blur-sm border border-white/10">
            {activeIndex + 1} / {images.length}
          </span>
        </div>
      )}
    </>
  );
}

function ProductDetailContent() {
  const searchParams = useSearchParams();
  const routeParams = useParams();
  const routeId = typeof routeParams?.id === "string" ? routeParams.id : "";
  const { user } = useAuth();
  const { ref: heroRef, isInView: heroVisible } = useInView({ threshold: 0.1 });
  const [catalogLoading, setCatalogLoading] = useState(!!routeId);
  const [product, setProduct] = useState<ProductData | null>(() => {
    if (typeof window === "undefined") return null;
    // Try sessionStorage first (set by app navigation)
    try {
      const stored = sessionStorage.getItem("selectedProduct");
      if (stored) return JSON.parse(stored);
    } catch {
      // malformed cache — fall through to URL params
    }
    // Fall back to URL params (works for shared/bookmarked links)
    const t = searchParams.get("t");
    if (t) {
      const cat = searchParams.get("cat");
      const tags = searchParams.get("tags");
      return {
        id: "",
        title: t,
        price: searchParams.get("p") ? parseFloat(searchParams.get("p")!) : null,
        image: searchParams.get("img"),
        link: searchParams.get("link") || "#",
        source: searchParams.get("src") || "amazon",
        rating: searchParams.get("r") ? parseFloat(searchParams.get("r")!) : undefined,
        reviews: searchParams.get("rev") ? parseInt(searchParams.get("rev")!) : undefined,
        category: cat || undefined,
        tags: tags ? tags.split(",").filter(Boolean) : undefined,
      };
    }
    return null;
  });
  const [fetchedImages, setFetchedImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<Record<string, unknown> | null>(null);
  const [loadingEnrichment, setLoadingEnrichment] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState(false);
  const [reviewData, setReviewData] = useState<Record<string, unknown> | null>(null);
  const [reviewError, setReviewError] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [marketIntelData, setMarketIntelData] = useState<Record<string, unknown> | null>(null);
  const [marketIntelError, setMarketIntelError] = useState(false);
  const [loadingMarketIntel, setLoadingMarketIntel] = useState(false);
  const [listingData, setListingData] = useState<Record<string, unknown> | null>(null);
  const [listingError, setListingError] = useState(false);
  const [loadingListing, setLoadingListing] = useState(false);
  const [retryEnrichment, setRetryEnrichment] = useState(0);
  const [retryReview, setRetryReview] = useState(0);
  const [retryMarketIntel, setRetryMarketIntel] = useState(0);
  const [retryListing, setRetryListing] = useState(0);
  const [priceHistory, setPriceHistory] = useState<ProductPricePoint[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const title = product?.title || searchParams.get("t") || "Product";
  const price = product?.price != null ? String(product.price) : searchParams.get("p");
  const image = product?.image || searchParams.get("img");
  const link = product?.link || searchParams.get("link") || "#";
  const source = product?.source || searchParams.get("src") || "amazon";
  const effectiveLink = buildProductUrl(link, source, title);
  // Honest CTA labeling: when the original product link is missing ("#"), the
  // CTA opens a platform search (or a store homepage for CJ/Temu) instead of
  // the exact listing — so the label must not imply a direct product link.
  const platformName = source.replace("_", " ");
  const missingProductLink = !link || link === "#";
  const fallbackKind: "search" | "homepage" | null = !missingProductLink
    ? null
    : source === "cj" || source === "temu"
      ? "homepage"
      : "search";
  const ctaLabel =
    fallbackKind === "search"
      ? `Search ${platformName} for this product`
      : fallbackKind === "homepage"
        ? `Open ${platformName} store`
        : `View on ${platformName}`;
  const ctaFallbackNote =
    fallbackKind === "search"
      ? `Direct product link unavailable — opens ${platformName} search results instead of the exact listing.`
      : fallbackKind === "homepage"
        ? `Direct product link unavailable — opens the ${platformName} homepage instead of the exact listing.`
        : null;
  const rating = product?.rating != null ? String(product.rating) : searchParams.get("r");
  const reviews = product?.reviews != null ? String(product.reviews) : searchParams.get("rev");
  const category = product?.category || "General";
  const tags = product?.tags || [...new Set(title.toLowerCase().split(" ").slice(0, 6).filter((t) => t.length > 1))];
  const productId = product?.productId || `SKU-${title.slice(0, 8).replace(/\s+/g, "").toUpperCase()}`;
  const asin = product?.asin || "";
  // One id for the whole product → supplier → store → order chain. Used for the
  // supplier assignment, store push and (via aliasing) order webhook lookup.
  const workflowProductId = stableProductId({
    id: product?.id,
    productId: product?.productId,
    source,
    link,
    title,
  });

  // ── Product → supplier → store workflow state ──────────────────────────
  const { data: supplierAssignment } = useAPI<{
    assignment?: { selectedSupplierId?: string; selectedSupplierName?: string; supplierId?: string; supplierName?: string };
  }>(user && workflowProductId ? `/api/fulfillment/suppliers?productId=${encodeURIComponent(workflowProductId)}` : null);
  const [selectedSupplier, setSelectedSupplier] = useState<{ id: string; name: string } | null>(null);
  const [listedOnStore, setListedOnStore] = useState(false);

  useEffect(() => {
    const a = supplierAssignment?.assignment;
    const id = a?.selectedSupplierId || a?.supplierId;
    if (id) setSelectedSupplier({ id, name: a?.selectedSupplierName || a?.supplierName || "Supplier" });
  }, [supplierAssignment]);

  // A shared/bookmarked link has no sessionStorage and may omit URL params. Load
  // the saved product snapshot by its stable id so the page is addressable.
  useEffect(() => {
    if (product || !user || !routeId) {
      if (product || !routeId) setCatalogLoading(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "users", user.uid, "productCatalog", routeId))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data();
          setProduct({
            id: routeId,
            title: (d.title as string) || "",
            price: typeof d.price === "number" ? d.price : null,
            image: (d.image as string) || null,
            images: (d.images as string[]) || undefined,
            link: (d.link as string) || "#",
            source: (d.source as string) || "amazon",
            rating: typeof d.rating === "number" ? d.rating : undefined,
            reviews: typeof d.reviews === "number" ? d.reviews : undefined,
          });
        }
      })
      .catch(() => { /* fall through to URL params / not-found state */ })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, [product, user, routeId]);

  const hasNoData = !product && !searchParams.get("t") && !catalogLoading;

  const storedImages = product?.images || (image ? [image] : []);
  const images = fetchedImages.length > storedImages.length ? fetchedImages : storedImages;
  const displayImages = images.filter((img) => img && img.startsWith("http"));

  const parsedPrice = price ? parseFloat(price) : NaN;
  const parsedRating = rating ? parseFloat(rating) : NaN;
  const parsedReviews = reviews ? parseInt(reviews, 10) : NaN;
  const priceNum = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;
  const ratingNum = Number.isFinite(parsedRating) && parsedRating > 0 ? parsedRating : null;
  const reviewsNum = Number.isFinite(parsedReviews) && parsedReviews >= 0 ? parsedReviews : null;
  const hasPrice = priceNum !== null;
  const hasRating = ratingNum !== null;
  const hasReviews = reviewsNum !== null;

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) return {};
    try {
      const token = await user.getIdToken();
      return { Authorization: `Bearer ${token}` };
    } catch {
      return {};
    }
  }, [user]);

  useEffect(() => {
    if (fetchedImages.length > 0 || !source) return;

    const extractAsin = (url: string): string => {
      const patterns = [
        /\/dp\/([A-Z0-9]{10})/i,
        /\/product\/([A-Z0-9]{10})/i,
        /\/gp\/product\/([A-Z0-9]{10})/i,
        /\/ASIN\/([A-Z0-9]{10})/i,
        /asin[=\/]([A-Z0-9]{10})/i,
        /\/ap\/([A-Z0-9]{10})/i,
      ];
      for (const pat of patterns) {
        const m = url.match(pat);
        if (m) return m[1];
      }
      return "";
    };

    const extractedAsin = asin || extractAsin(link);
    if (!link || link === "#") return;

    let cancelled = false;

    const fetchImages = async () => {
      setLoadingImages(true);
      try {
        const authHeaders = await getAuthHeaders();
        const data = await safeFetch<{ images?: string[] }>("/api/platforms/product-images", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ asin: extractedAsin, url: link, source }),
        });
        if (!cancelled && Array.isArray(data.images) && data.images.length > 0) {
          const mergedImages = [...new Set([...storedImages, ...data.images])];
          if (mergedImages.length > storedImages.length) setFetchedImages(mergedImages);
        }
      } catch (err) {
        logger.error("Failed to fetch product images", { error: err instanceof Error ? err.message : String(err) });
      }
      if (!cancelled) setLoadingImages(false);
    };

    fetchImages();
    return () => { cancelled = true; };
  }, [asin, link, source, fetchedImages.length, storedImages.length, getAuthHeaders]);

  useEffect(() => {
    if (!title || title === "Product") return;

    // AbortController: navigating away mid-fetch must cancel the request,
    // otherwise setState fires on an unmounted component.
    const controller = new AbortController();

    const fetchEnrichment = async () => {
      setLoadingEnrichment(true);
      setEnrichmentError(false);
      try {
        const authHeaders = await getAuthHeaders();
        const data = await safeFetch<{ platforms?: { platform: string; price: number; rating: number | null; reviews: number | null; inStock: boolean | null; url: string }[]; [k: string]: unknown }>("/api/products/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ title, source, price: priceNum }),
          signal: controller.signal,
        });
        if (data.platforms) {
          setEnrichmentData(data);
        } else {
          // A 2xx response without usable data is still a failure for this
          // section — surface the retry UI instead of a blank panel.
          setEnrichmentError(true);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setEnrichmentError(true);
        console.warn("[ProductDetail] Error:", e instanceof Error ? e.message : e);
      }
      setLoadingEnrichment(false);
    };

    fetchEnrichment();
    return () => controller.abort();
  }, [title, source, priceNum, getAuthHeaders, retryEnrichment]);

  useEffect(() => {
    if (!title || title === "Product") return;

    const controller = new AbortController();

    const fetchReviews = async () => {
      setLoadingReview(true);
      setReviewError(false);
      try {
        const authHeaders = await getAuthHeaders();
        const data = await safeFetch<{ averageRating?: number; [k: string]: unknown }>("/api/products/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ url: link, source, title, rating: ratingNum, reviews: reviewsNum }),
          signal: controller.signal,
        });
        if (data.averageRating !== undefined) {
          setReviewData(data);
        } else {
          setReviewData(null);
          setReviewError(false);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setReviewError(true);
        console.warn("[ProductDetail] Error:", e instanceof Error ? e.message : e);
      }
      setLoadingReview(false);
    };

    fetchReviews();
    return () => controller.abort();
  }, [title, link, source, ratingNum, reviewsNum, getAuthHeaders, retryReview]);

  useEffect(() => {
    if (!title || title === "Product") return;

    const controller = new AbortController();

    const fetchMarketIntel = async () => {
      setLoadingMarketIntel(true);
      setMarketIntelError(false);
      try {
        const authHeaders = await getAuthHeaders();
        const data = await safeFetch<{ searchVolume?: number; [k: string]: unknown }>("/api/products/market-intel", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ title, price: priceNum, rating: ratingNum, reviews: reviewsNum }),
          signal: controller.signal,
        });
        // Explicit validity check: searchVolume can legitimately be a string
        // like "low" or 0 — only `undefined`/null mean "no data".
        if (data.searchVolume !== undefined && data.searchVolume !== null) {
          setMarketIntelData(data);
        } else {
          setMarketIntelError(true);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setMarketIntelError(true);
        console.warn("[ProductDetail] Error:", e instanceof Error ? e.message : e);
      }
      setLoadingMarketIntel(false);
    };

    fetchMarketIntel();
    return () => controller.abort();
  }, [title, priceNum, ratingNum, reviewsNum, getAuthHeaders, retryMarketIntel]);

  useEffect(() => {
    if (!title || title === "Product") return;

    const controller = new AbortController();

    const fetchListing = async () => {
      setLoadingListing(true);
      setListingError(false);
      try {
        const authHeaders = await getAuthHeaders();
        const data = await safeFetch<{ title?: string; [k: string]: unknown }>("/api/products/listing", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ title, category, price: priceNum, platform: source }),
          signal: controller.signal,
        });
        if (data.title) {
          setListingData(data);
        } else {
          setListingError(true);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setListingError(true);
        console.warn("[ProductDetail] Error:", e instanceof Error ? e.message : e);
      }
      setLoadingListing(false);
    };

    fetchListing();
    return () => controller.abort();
  }, [title, category, priceNum, source, getAuthHeaders, retryListing]);

  // Record today's price snapshot and load the recorded series, so the
  // Trend column shows real recorded history instead of an empty dash.
  const historyKey = useMemo(
    () => (title && title !== "Product" ? productPriceKey(title, category) : ""),
    [title, category]
  );

  useEffect(() => {
    if (!historyKey || !user) return;
    const controller = new AbortController();
    const syncHistory = async () => {
      try {
        const authHeaders = await getAuthHeaders();
        const prices: Record<string, number> = {};
        if (priceNum && priceNum > 0) prices[source] = priceNum;
        const platformsRaw = (enrichmentData?.platforms as { platform: string; price: number }[] | undefined) || [];
        for (const p of platformsRaw) {
          if (p && typeof p.price === "number" && p.price > 0) prices[p.platform] = p.price;
        }
        if (Object.keys(prices).length > 0) {
          await safeFetch("/api/products/price-history", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({ key: historyKey, title, prices }),
            signal: controller.signal,
          });
        }
        const data = await safeFetch<{ history?: ProductPricePoint[] }>(
          `/api/products/price-history?key=${encodeURIComponent(historyKey)}`,
          { headers: { ...authHeaders }, signal: controller.signal }
        );
        if (!controller.signal.aborted && Array.isArray(data.history)) {
          setPriceHistory(data.history);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        logger.error("Failed to sync price history", { error: e instanceof Error ? e.message : e });
      }
    };
    syncHistory();
    return () => controller.abort();
  }, [historyKey, title, source, priceNum, enrichmentData, user, getAuthHeaders]);

  const enriched = useMemo(() => {
    if (enrichmentData?.platforms) {
      const platformsRaw = enrichmentData.platforms as { platform: string; price: number; rating: number | null; reviews: number | null; inStock: boolean | null; url: string }[];
      const platforms = platformsRaw.map((p) => ({
        ...p,
        // Real recorded per-platform history (may be empty for a newly
        // viewed product — the table renders an honest dash then).
        sparkline: seriesForPlatform(priceHistory, p.platform).map((s) => s.price),
      }));
      const cheapest = enrichmentData.cheapest as { platform: string; price: number } | null;
      const supplierMatchesRaw = (enrichmentData.supplierMatches || []) as { id: string; name: string; trustBadge: string | null; location: string; flag: string; price: number | null; shippingToUS: string | null; shippingToEU: string | null; reliabilityScore: number | null; responseTime: string | null }[];
      const supplierMatches = supplierMatchesRaw.map((s) => ({ ...s, trustBadge: s.trustBadge as "gold" | "silver" | "bronze" | "unverified" | null }));
      const supplierOffers = (enrichmentData.supplierOffers || []) as {
        supplierId: string; platformId: "cj" | "aliexpress" | "alibaba" | "dhgate" | "global_sources";
        supplierName: string; storeUrl: string | null; productId: string; title: string; image: string | null;
        url: string; unitCost: number | null; currency: string | null; shippingCost: number | null;
        shippingDays: number | null; rating: number | null; reviews: number | null; inStock: boolean | null;
        stockLevel: number | null; moq: number | null; dataSource: "live" | "estimated";
        confidence: number; matchReasons: string[];
      }[];
      const supplierAutoLink = (enrichmentData.autoLink || null) as {
        offer: (typeof supplierOffers)[number]; confidence: number;
      } | null;

      const basePriceForCalc = cheapest?.price || priceNum || 0;
      const priceSpreadNum = typeof enrichmentData.priceSpread === "number" ? enrichmentData.priceSpread : 0;

      const realReviewsData = reviewData && typeof reviewData.averageRating === "number" ? {
        averageRating: reviewData.averageRating as number,
        totalReviews: (reviewData.totalReviews as number) || reviewsNum || 0,
        distribution: (reviewData.distribution as { stars: number; percent: number }[]) || [],
        sentiment: (reviewData.sentiment as { positive: string[]; neutral: string[]; negative: string[] }) || { positive: [], neutral: [], negative: [] },
        topKeywords: (reviewData.topKeywords as string[]) || [],
        commonComplaints: (reviewData.commonComplaints as string[]) || [],
        commonPraise: (reviewData.commonPraise as string[]) || [],
        trustworthyScore: typeof reviewData.trustworthyScore === "number" ? reviewData.trustworthyScore : null,
        ratingsEstimated: reviewData.ratingsEstimated === true,
      } : null;

      const realMarketIntel = marketIntelData && typeof marketIntelData.searchVolume === "string" ? {
        searchVolume: marketIntelData.searchVolume as "high" | "medium" | "low",
        interestIndex: (marketIntelData.interestIndex as number) || 0,
        trendDirection: (marketIntelData.trendDirection as "rising" | "stable" | "declining") || "stable",
        trendSparkline: (marketIntelData.trendSparkline as number[]) || [],
        seasonality: (marketIntelData.seasonality as string) || "",
        bestTimeToSell: (marketIntelData.bestTimeToSell as string) || "",
        competitionLevel: (marketIntelData.competitionLevel as "low" | "medium" | "high" | "very-high") || "medium",
        estimatedSellers: (marketIntelData.estimatedSellers as number) || 0,
        avgSellerRating: typeof (marketIntelData.avgSellerRating as number | null) === "number" ? (marketIntelData.avgSellerRating as number) : null,
        priceWarRisk: (marketIntelData.priceWarRisk as "low" | "medium" | "high") || "medium",
        canCompete: (marketIntelData.canCompete as string) || "",
        riskScore: (marketIntelData.riskScore as number) || 0,
        riskFactors: (marketIntelData.riskFactors as { label: string; level: "safe" | "caution" | "avoid" }[]) || [],
      } : null;

      const realListingSuggestion = listingData && typeof listingData.title === "string" ? {
        title: listingData.title as string,
        description: (listingData.description as string) || "",
        tags: (listingData.tags as string[]) || [],
        suggestedPriceRange: (listingData.suggestedPriceRange as string) || "",
        fallback: listingData.fallback === true,
        platformTips: (listingData.platformTips as { platform: string; tip: string }[]) || [],
      } : null;

      const ratedPlatforms = platforms.filter((p) => typeof p.rating === "number");
      return {
        platforms,
        cheapest: cheapest || (basePriceForCalc > 0 ? { platform: source, price: basePriceForCalc } : null),
        mostExpensive: enrichmentData.mostExpensive || (basePriceForCalc > 0 ? { platform: "N/A", price: basePriceForCalc } : null),
        priceSpread: priceSpreadNum,
        bestRating: [...ratedPlatforms].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0] || null,
        reviewsData: realReviewsData,
        marketIntel: realMarketIntel,
        listingSuggestion: realListingSuggestion,
        supplierMatches,
        supplierOffers,
        supplierAutoLink,
      };
    }

    return {
      platforms: priceNum ? [{ platform: source, price: priceNum, rating: ratingNum, reviews: reviewsNum, inStock: null, url: effectiveLink, sparkline: [] }] : [],
      cheapest: priceNum ? { platform: source, price: priceNum } : null,
      mostExpensive: null,
      priceSpread: 0,
      bestRating: null,
      reviewsData: reviewData && typeof reviewData.averageRating === "number" ? {
        averageRating: reviewData.averageRating as number,
        totalReviews: (reviewData.totalReviews as number) || reviewsNum || 0,
        distribution: (reviewData.distribution as { stars: number; percent: number }[]) || [],
        sentiment: (reviewData.sentiment as { positive: string[]; neutral: string[]; negative: string[] }) || { positive: [], neutral: [], negative: [] },
        topKeywords: (reviewData.topKeywords as string[]) || [],
        commonComplaints: (reviewData.commonComplaints as string[]) || [],
        commonPraise: (reviewData.commonPraise as string[]) || [],
        trustworthyScore: typeof reviewData.trustworthyScore === "number" ? reviewData.trustworthyScore : null,
        ratingsEstimated: reviewData.ratingsEstimated === true,
      } : null,
      marketIntel: marketIntelData && typeof marketIntelData.searchVolume === "string" ? {
        searchVolume: marketIntelData.searchVolume as "high" | "medium" | "low",
        interestIndex: (marketIntelData.interestIndex as number) || 0,
        trendDirection: (marketIntelData.trendDirection as "rising" | "stable" | "declining") || "stable",
        trendSparkline: (marketIntelData.trendSparkline as number[]) || [],
        seasonality: (marketIntelData.seasonality as string) || "",
        bestTimeToSell: (marketIntelData.bestTimeToSell as string) || "",
        competitionLevel: (marketIntelData.competitionLevel as "low" | "medium" | "high" | "very-high") || "medium",
        estimatedSellers: (marketIntelData.estimatedSellers as number) || 0,
        avgSellerRating: typeof (marketIntelData.avgSellerRating as number | null) === "number" ? (marketIntelData.avgSellerRating as number) : null,
        priceWarRisk: (marketIntelData.priceWarRisk as "low" | "medium" | "high") || "medium",
        canCompete: (marketIntelData.canCompete as string) || "",
        riskScore: (marketIntelData.riskScore as number) || 0,
        riskFactors: (marketIntelData.riskFactors as { label: string; level: "safe" | "caution" | "avoid" }[]) || [],
      } : null,
      listingSuggestion: listingData && typeof listingData.title === "string" ? {
        title: listingData.title as string,
        description: (listingData.description as string) || "",
        tags: (listingData.tags as string[]) || [],
        suggestedPriceRange: (listingData.suggestedPriceRange as string) || "",
        fallback: listingData.fallback === true,
        platformTips: (listingData.platformTips as { platform: string; tip: string }[]) || [],
      } : null,
      supplierMatches: [],
      supplierOffers: [],
      supplierAutoLink: null,
    };
  }, [enrichmentData, reviewData, marketIntelData, listingData, source, priceNum, ratingNum, reviewsNum, effectiveLink, priceHistory]);

  // Longest recorded per-platform series, for the price-history modal.
  const historySeries = useMemo(() => {
    let best: { date: string; price: number }[] = [];
    let bestPlatform = "";
    for (const p of enriched.platforms as { platform: string }[]) {
      const s = seriesForPlatform(priceHistory, p.platform);
      if (s.length > best.length) {
        best = s;
        bestPlatform = p.platform;
      }
    }
    return { series: best, platform: bestPlatform };
  }, [enriched.platforms, priceHistory]);

  const supplierParams = new URLSearchParams({ product: title, category, source });
  if (priceNum !== null) supplierParams.set("price", String(priceNum));

  const validationParams = new URLSearchParams({ productTitle: title });
  if (priceNum !== null) {
    validationParams.set("currentPrice", String(priceNum));
    validationParams.set("productCost", String(priceNum));
    validationParams.set("estimatedSellingPrice", String(Number((priceNum * 2.2).toFixed(2))));
  }
  if (source) validationParams.set("source", source);
  if (image) validationParams.set("productImage", image);
  if (link && link !== "#") validationParams.set("productUrl", link);
  if (category) validationParams.set("category", category);
  const validationRating = typeof reviewData?.averageRating === "number" ? reviewData.averageRating : ratingNum;
  const validationReviewCount = typeof reviewData?.totalReviews === "number" ? reviewData.totalReviews : reviewsNum;
  if (validationRating !== null) validationParams.set("rating", String(validationRating));
  if (validationReviewCount !== null) validationParams.set("reviews", String(validationReviewCount));
  const historicalSourcePrices = seriesForPlatform(priceHistory, source)
    .slice(-12)
    .map(({ price: historicalPrice }) => historicalPrice);
  if (historicalSourcePrices.length > 0) {
    validationParams.set("historicalPrices", historicalSourcePrices.join(","));
  }
  const validationPlatforms = Array.isArray(enrichmentData?.platforms)
    ? (enrichmentData.platforms as { platform: string; title?: string; price: number; rating: number | null; reviews: number | null }[])
      .filter((platform) => typeof platform.price === "number" && platform.price > 0)
      .slice(0, 5)
      .map(({ platform, title: platformTitle, price, rating: platformRating, reviews: platformReviews }) => ({
        platform,
        title: platformTitle,
        price,
        rating: platformRating,
        reviews: platformReviews,
      }))
    : [];
  if (validationPlatforms.length > 0) validationParams.set("platformPrices", JSON.stringify(validationPlatforms));
  const bestPlatformPrice = (enrichmentData?.cheapest as { price?: number } | null)?.price;
  if (typeof bestPlatformPrice === "number" && bestPlatformPrice > 0) {
    validationParams.set("bestPrice", String(bestPlatformPrice));
  }
  if (typeof marketIntelData?.estimatedSellers === "number") {
    validationParams.set("competitorCount", String(marketIntelData.estimatedSellers));
  }
  if (typeof marketIntelData?.avgSellerRating === "number") {
    validationParams.set("sellerRating", String(marketIntelData.avgSellerRating));
  }
  if (typeof marketIntelData?.interestIndex === "number") {
    validationParams.set("searchInterestIndex", String(marketIntelData.interestIndex));
  }
  if (Array.isArray(marketIntelData?.trendSparkline)) {
    validationParams.set("historicalInterestIndex", marketIntelData.trendSparkline.join(","));
  }
  const marketCompetition = marketIntelData?.competitionLevel;
  const saturationLevelByCompetition: Record<string, string> = {
    low: "low",
    medium: "moderate",
    high: "saturated",
    "very-high": "hyper-saturated",
  };
  if (typeof marketCompetition === "string" && saturationLevelByCompetition[marketCompetition]) {
    validationParams.set("saturationLevel", saturationLevelByCompetition[marketCompetition]);
  }
  const enrichedPlatforms = enrichmentData?.platforms as { brand?: string }[] | undefined;
  const detectedBrand = enrichedPlatforms?.find((platform) => platform.brand)?.brand;
  if (detectedBrand) validationParams.set("brand", detectedBrand);
  const matchedSuppliers = enrichmentData?.supplierMatches as { name?: string; reliabilityScore?: number }[] | undefined;
  const matchedSupplier = matchedSuppliers?.[0];
  if (matchedSupplier?.name) validationParams.set("supplierName", matchedSupplier.name);
  if (typeof matchedSupplier?.reliabilityScore === "number" && matchedSupplier.reliabilityScore > 0) {
    validationParams.set("supplierReliability", String(matchedSupplier.reliabilityScore));
  }

  const listingParams = new URLSearchParams({ title });
  if (priceNum !== null) listingParams.set("price", String(priceNum));
  if (category) listingParams.set("category", category);
  if (["amazon", "shopify", "etsy", "ebay", "walmart"].includes(source)) {
    listingParams.set("platform", source);
  }

  const calculatorParams = new URLSearchParams();
  if (priceNum !== null) {
    calculatorParams.set("cost", String(priceNum));
    calculatorParams.set("price", String(Number((priceNum * 2.2).toFixed(2))));
  }

  const contentParams = new URLSearchParams({ productTitle: title });
  if (image) contentParams.set("productImage", image);

  const reviewParams = new URLSearchParams({ productTitle: title });
  if (link && link !== "#") reviewParams.set("productUrl", link);
  if (["aliexpress", "cj", "amazon", "ebay"].includes(source)) reviewParams.set("source", source);

  const complianceParams = new URLSearchParams({ productTitle: title });
  if (product?.category) complianceParams.set("category", product.category);
  if (priceNum !== null) complianceParams.set("sellingPrice", String(priceNum));
  if (link && link !== "#") complianceParams.set("productUrl", link);
  if (image) complianceParams.set("productImage", image);

  const priceWarParams = new URLSearchParams({ productTitle: title, platforms: source });
  if (priceNum !== null) {
    priceWarParams.set("cost", String(priceNum));
    priceWarParams.set("myPrice", String(Number((priceNum * 2.2).toFixed(2))));
  }
  if (image) priceWarParams.set("productImage", image);
  if (link && link !== "#") priceWarParams.set("productUrl", link);

  const trendParams = new URLSearchParams({ keyword: title });
  if (product?.category) trendParams.set("category", product.category);
  if (image) trendParams.set("imageUrl", image);

  const lifecycleParams = new URLSearchParams({ productTitle: title });
  lifecycleParams.set("productId", product?.id || product?.productId || productId);
  if (image) lifecycleParams.set("productImage", image);
  if (product?.category) lifecycleParams.set("category", product.category);

  const productContext = {
    id: product?.id || productId,
    title,
    price: priceNum,
    image: image || null,
    link: effectiveLink,
    source,
    rating: ratingNum ?? undefined,
    reviews: reviewsNum ?? undefined,
  };
  const contextualLinks = [
    {
      href: `/suppliers?${supplierParams.toString()}`,
      label: "Find suppliers",
      description: "Search suppliers for this product and category",
      icon: Truck,
    },
    {
      href: `/competitors?q=${encodeURIComponent(title)}`,
      label: "Analyze competitors",
      description: "Compare this product across the market",
      icon: Swords,
      onClick: () => {
        try {
          sessionStorage.setItem("competitorProduct", JSON.stringify(productContext));
        } catch {
          // The query URL still launches a title-based competitor search.
        }
      },
    },
    ...(priceNum !== null ? [{
      href: `/calculator/profit?${calculatorParams.toString()}`,
      label: "Model profitability",
      description: "Start with source price and an estimated 2.2x retail price",
      icon: Calculator,
    }] : []),
    {
      href: `/product-validation?${validationParams.toString()}`,
      label: "Validate product",
      description: "Run product, market, and supplier checks",
      icon: ShieldCheck,
    },
    {
      href: `/product-listings?${listingParams.toString()}`,
      label: "Create a listing",
      description: "Start an optimized listing with product details",
      icon: FileText,
    },
    {
      href: `/reviews?${reviewParams.toString()}`,
      label: "Import reviews",
      description: "Prepare a review import for this product",
      icon: Star,
    },
    {
      href: `/social-content?${contentParams.toString()}`,
      label: "Create social content",
      description: "Generate product-specific social content",
      icon: Share2,
    },
    {
      href: `/compliance?${complianceParams.toString()}`,
      label: "Check compliance",
      description: "Check this product before listing it",
      icon: ShieldCheck,
    },
    {
      href: `/price-war?${priceWarParams.toString()}`,
      label: "Set a price rule",
      description: "Prepare a competitor pricing rule for this product",
      icon: DollarSign,
    },
    {
      href: `/trends?${trendParams.toString()}`,
      label: "Analyze product trend",
      description: "Analyze market trends for this product",
      icon: TrendingUp,
    },
    {
      href: `/product-lifecycle?${lifecycleParams.toString()}`,
      label: "Track lifecycle",
      description: "Add this product to lifecycle tracking",
      icon: Activity,
    },
  ];

  if (catalogLoading && !product && !searchParams.get("t")) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  if (hasNoData) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Link href="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Search
        </Link>
        <div className="glass rounded-2xl p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Product not found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This product data is no longer available. Please search again.
          </p>
          <Link href="/products" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all">
            <Search className="h-4 w-4" /> Search Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-atmosphere max-w-5xl mx-auto space-y-6 md:space-y-8 pb-20 md:pb-28 relative z-10">
      {/* Sticky product summary bar */}
      <StickyProductBar
        title={title}
        price={priceNum}
        image={image}
        rating={ratingNum}
        reviews={reviewsNum}
        source={source}
        link={effectiveLink}
        linkLabel={ctaLabel}
        heroRef={heroRef}
      />

      {/* Back navigation */}
      <Link href="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Search
      </Link>

      {/* === SECTION 1: HERO SHOWCASE === */}
      <div id="overview" ref={heroRef} className={`hero-glow scroll-mt-24 transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
          {/* Image column */}
          <div className="space-y-3">
            <ImageGallery images={displayImages} title={title} />
            {loadingImages && (
              <div className="flex items-center gap-2 text-xs text-accent">
                <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span>Fetching all product images...</span>
              </div>
            )}
            {displayImages.length > 1 && !loadingImages && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Images className="h-3 w-3" />
                <span>{displayImages.length} images available from {source.replace("_", " ")}</span>
              </div>
            )}
          </div>

          {/* Info column */}
          <div className="space-y-4">
            {/* Platform tag + Title */}
            <div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs mb-3 ${platformColors[source] || "bg-surface border-border text-muted-foreground"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${platformDotColors[source] || "bg-muted-foreground"}`} />
                {platformIcons[source] || "\ud83d\udd17"} {source.replace("_", " ")}
              </span>
              <h1 className="font-display text-2xl sm:text-3xl md:text-[2rem] font-bold text-foreground leading-tight tracking-tight">{title}</h1>
            </div>

            {/* Category + Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2.5 py-1 rounded-lg bg-surface/80 border border-border text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> {category}
              </span>
              {tags.slice(0, 4).map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-lg bg-accent/8 border border-accent/15 text-accent/90">{t}</span>
              ))}
            </div>

            {/* Product ID */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Barcode className="h-3.5 w-3.5" />
              <span className="font-mono text-[11px]">{productId}</span>
            </div>

            {/* Price Hero */}
            {hasPrice && (
              <div className="price-hero animate-card-enter">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 font-medium">Listed Price</p>
                <p className="font-display text-4xl sm:text-5xl font-bold gradient-text-blue tracking-tight">${(priceNum ?? 0).toFixed(2)}</p>
              </div>
            )}

            {/* Quick Stats strip */}
            <div className="flex items-center gap-3 flex-wrap">
              {hasRating && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-400/8 border border-amber-400/15">
                  <Star className="h-3 w-3 text-amber-400 fill-current" />
                  <span className="text-[11px] font-semibold text-amber-400">{(ratingNum ?? 0).toFixed(1)}</span>
                </div>
              )}
              {hasReviews && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-400/8 border border-blue-400/15">
                  <span className="text-[11px] font-semibold text-blue-400">{(reviewsNum ?? 0).toLocaleString()} reviews</span>
                </div>
              )}
              {enriched.marketIntel && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                  enriched.marketIntel.riskScore <= 30 ? "bg-emerald-400/8 border-emerald-400/15" :
                  enriched.marketIntel.riskScore <= 60 ? "bg-amber-400/8 border-amber-400/15" :
                  "bg-red-400/8 border-red-400/15"
                }`}>
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span className={`text-[11px] font-semibold ${
                    enriched.marketIntel.riskScore <= 30 ? "text-emerald-400" :
                    enriched.marketIntel.riskScore <= 60 ? "text-amber-400" :
                    "text-red-400"
                  }`}>Risk: {enriched.marketIntel.riskScore}/100</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface border border-border">
                <span className="text-[11px] text-muted-foreground capitalize">{source.replace("_", " ")}</span>
              </div>
            </div>

            {/* Rating Badge */}
            {(hasRating || hasReviews) && (
              <div className="rating-badge">
                <div className="flex flex-wrap items-center gap-3">
                  {hasRating && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${s <= Math.round(ratingNum ?? 0) ? "text-amber-400 fill-current" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                      <span className="font-display text-xl font-bold text-foreground">{(ratingNum ?? 0).toFixed(1)}</span>
                    </div>
                  )}
                  {hasReviews && <span className="text-sm text-muted-foreground">{(reviewsNum ?? 0).toLocaleString()} reviews</span>}
                  {hasRating && ratingNum && ratingNum >= 4.5 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-semibold border border-emerald-400/20 flex items-center gap-1">
                      <Shield className="h-2.5 w-2.5" /> Top Rated
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <a href={effectiveLink} target="_blank" rel="noopener noreferrer" className="btn-hero-cta flex items-center justify-center gap-2">
                <ShoppingCart className="h-4 w-4" /> {ctaLabel} <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {ctaFallbackNote && (
                <p className="self-center text-[11px] text-muted-foreground/70">{ctaFallbackNote}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <ProductActionBar platform={source} platformUrl={effectiveLink} productTitle={title} category={category} id={product?.id} price={priceNum} image={image} images={displayImages} rating={ratingNum} reviews={reviewsNum} />

      <section aria-labelledby="product-tools-heading" className="border-y border-border/70 py-5">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
          <div>
            <p className="section-label mb-1">Continue researching</p>
            <h2 id="product-tools-heading" className="font-display text-base font-semibold text-foreground">Explore this product</h2>
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-full sm:max-w-[45%]" title={title}>{title}</span>
        </div>
        <nav aria-label="Product-specific tools" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {contextualLinks.map(({ href, label, description, icon: Icon, onClick }) => (
            <Link
              key={label}
              href={href}
              onClick={onClick}
              className="group flex min-w-0 items-center gap-3 rounded-lg border border-border bg-surface/50 p-3 transition-colors hover:border-accent/30 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                  {label}<ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
                <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{description}</span>
              </span>
            </Link>
          ))}
        </nav>
      </section>

      <section id="image-matches" className="section-group scroll-mt-24">
        <p className="section-label mb-2">Verify this product</p>
        <CrossPlatformImageMatches imageUrl={image || displayImages[0] || null} source={source} />
      </section>

      <section id="market-intel" className="section-group scroll-mt-24">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="section-label">Market opportunity</p>
          <Link href={`/competitors?q=${encodeURIComponent(title)}`} className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors">
            <BarChart3 className="h-3.5 w-3.5" /> Competitor analysis
          </Link>
        </div>
        {loadingMarketIntel && <SectionSkeleton rows={4} />}
        {marketIntelError && !loadingMarketIntel && (
          <div className="intel-card p-4 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-muted-foreground flex-1">Failed to load market intelligence</p>
            <button onClick={() => { setMarketIntelError(false); setLoadingMarketIntel(true); setRetryMarketIntel((c) => c + 1); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
        {!loadingMarketIntel && !marketIntelError && (
          <MarketIntelligence data={enriched.marketIntel} />
        )}
      </section>

      <section id="price-comparison" className="section-group scroll-mt-24">
        <div className="flex items-center justify-between mb-2">
          <p className="section-label">Cross-platform pricing</p>
          {historySeries.series.length > 1 && (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors border border-accent/15"
            >
              <BarChart3 className="h-3 w-3" /> Price history ({historySeries.series.length} pts{historySeries.platform ? ` · ${historySeries.platform}` : ""})
            </button>
          )}
        </div>
        {loadingEnrichment && <SectionSkeleton rows={2} />}
        {enrichmentError && !loadingEnrichment && (
          <div className="glass rounded-2xl p-4 border border-border flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-muted-foreground flex-1">Failed to load price data</p>
            <button onClick={() => { setEnrichmentError(false); setLoadingEnrichment(true); setRetryEnrichment((c) => c + 1); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
        {!loadingEnrichment && !enrichmentError && (
          <PriceComparison platforms={enriched.platforms} listedPrice={priceNum || 0} productTitle={title} />
        )}
        <PriceHistoryChart data={historySeries.series} title={`${title}${historySeries.platform ? ` — ${historySeries.platform}` : ""}`} isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
      </section>

      <section id="reviews" className="section-group scroll-mt-24">
        <p className="section-label mb-2">Customer feedback</p>
        {loadingReview && <SectionSkeleton rows={3} />}
        {reviewError && !loadingReview && (
          <div className="review-card p-4 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-muted-foreground flex-1">Failed to load review data</p>
            <button onClick={() => { setReviewError(false); setLoadingReview(true); setRetryReview((c) => c + 1); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
        {!loadingReview && !reviewError && (
          <ReviewIntelligence data={enriched.reviewsData} />
        )}
      </section>

      <section id="suppliers" className="section-group scroll-mt-24">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="section-label">Sourcing &amp; listing</p>
          {selectedSupplier && (
            <PushToStoreButton
              productId={workflowProductId}
              title={title}
              image={image}
              price={priceNum}
              url={effectiveLink}
              description={`${title} — sourced from ${selectedSupplier.name}`}
              onPushed={() => setListedOnStore(true)}
            />
          )}
        </div>

        <SourcingSteps
          hasProduct={!!product || !!searchParams.get("t")}
          hasSupplier={!!selectedSupplier}
          hasListed={listedOnStore}
        />

        {selectedSupplier && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs">
            <span className="text-foreground">
              Supplier selected: <span className="font-medium">{selectedSupplier.name}</span>
            </span>
            <span className="text-emerald-400">Ready to list</span>
          </div>
        )}

        {(enriched.supplierOffers as unknown[]).length > 0 ? (
          <SupplierOffersTable
            productId={workflowProductId}
            offers={enriched.supplierOffers as Parameters<typeof SupplierOffersTable>[0]["offers"]}
            autoLink={enriched.supplierAutoLink as Parameters<typeof SupplierOffersTable>[0]["autoLink"]}
            onSelect={(o) => setSelectedSupplier({ id: o.supplierId, name: o.supplierName })}
          />
        ) : (
          <div className="space-y-3">
            <SupplierMatchSection suppliers={enriched.supplierMatches} productTitle={title} category={category} />
            <SupplierPicker
              productId={workflowProductId}
              productName={title}
              onAssigned={(a) => setSelectedSupplier({ id: a.supplierId, name: a.supplierName })}
            />
          </div>
        )}
      </section>

      <section id="calculator" className="section-group scroll-mt-24">
        <p className="section-label mb-2">Profitability</p>
        <ProfitCalculator sourcePrice={enriched.cheapest?.price || priceNum || 0} sellPrice={priceNum ? priceNum * 2.2 : 0} productTitle={title} />
      </section>

      <section id="listings" className="section-group scroll-mt-24">
        <p className="section-label mb-2">Prepare your listing</p>
        {loadingListing && <SectionSkeleton rows={3} />}
        {listingError && !loadingListing && (
          <div className="listing-card p-4 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-muted-foreground flex-1">Failed to load listing suggestions</p>
            <button onClick={() => { setListingError(false); setLoadingListing(true); setRetryListing((c) => c + 1); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}
        {!loadingListing && !listingError && (
          <ListingOptimization data={enriched.listingSuggestion} platform={source} />
        )}
      </section>

      <section id="similar" className="section-group scroll-mt-24">
        <p className="section-label mb-2">Explore alternatives</p>
        <SimilarProducts category={category} title={title} currentPrice={priceNum || undefined} />
      </section>

      <div id="searches" className="relative scroll-mt-24 rounded-2xl p-5 border border-border/50 bg-surface/30">
        <h3 className="font-display text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" /> Related Searches
        </h3>
        <div className="flex flex-wrap gap-2">
          {(tags.length > 0 ? tags : defaultSuggestedSearches).map((s) => (
            <Link key={s} href={`/products?q=${encodeURIComponent(s)}`} className="search-pill">
              <svg className="h-3 w-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {s}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<div className="max-w-5xl mx-auto flex items-center justify-center py-20"><div className="text-center"><div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-sm text-muted-foreground">Loading product...</p></div></div>}>
        <ProductDetailContent />
      </Suspense>
    </PageErrorBoundary>
  );
}
