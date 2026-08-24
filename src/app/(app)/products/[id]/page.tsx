"use client";

import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, ExternalLink, Star, ShoppingCart, Package,
  TrendingUp, Shield, Truck, Clock, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Images, Tag, Barcode, Layers,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import PriceComparison from "@/components/products/PriceComparison";
import ProfitCalculator from "@/components/products/ProfitCalculator";
import MarketIntelligence from "@/components/products/MarketIntelligence";
import ReviewIntelligence from "@/components/products/ReviewIntelligence";
import SupplierMatchSection from "@/components/products/SupplierMatch";
import ListingOptimization from "@/components/products/ListingOptimization";
import SimilarProducts from "@/components/products/SimilarProducts";
import ProductActionBar from "@/components/products/ProductActionBar";

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
          <img src={images[activeIndex]} alt={`${title} - Image ${activeIndex + 1}`} className="w-full h-full object-contain p-6 hover:scale-110 transition-transform duration-500" />
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
                <img src={img} alt="" className="w-full h-full object-cover" />
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
          <img src={images[activeIndex]} alt={title} className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
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
  const { ref: heroRef, isInView: heroVisible } = useInView({ threshold: 0.1 });
  const [showDetails, setShowDetails] = useState(true);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [fetchedImages, setFetchedImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<Record<string, unknown> | null>(null);
  const [loadingEnrichment, setLoadingEnrichment] = useState(false);
  const [reviewData, setReviewData] = useState<Record<string, unknown> | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [marketIntelData, setMarketIntelData] = useState<Record<string, unknown> | null>(null);
  const [loadingMarketIntel, setLoadingMarketIntel] = useState(false);
  const [listingData, setListingData] = useState<Record<string, unknown> | null>(null);
  const [loadingListing, setLoadingListing] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("selectedProduct");
    if (stored) {
      try { setProduct(JSON.parse(stored)); } catch {}
    }
  }, []);

  const title = product?.title || searchParams.get("t") || "Product";
  const price = product?.price != null ? String(product.price) : searchParams.get("p");
  const image = product?.image || searchParams.get("img");
  const link = product?.link || searchParams.get("link") || "#";
  const source = product?.source || searchParams.get("src") || "amazon";
  const rating = product?.rating != null ? String(product.rating) : searchParams.get("r");
  const reviews = product?.reviews != null ? String(product.reviews) : searchParams.get("rev");
  const category = product?.category || "General";
  const tags = product?.tags || title.toLowerCase().split(" ").slice(0, 4);
  const productId = product?.productId || `SKU-${title.slice(0, 8).replace(/\s+/g, "").toUpperCase()}`;
  const asin = product?.asin || "";

  const storedImages = product?.images || (image ? [image] : []);
  const images = fetchedImages.length > 0 ? fetchedImages : storedImages;

  const hasPrice = price && price !== "" && price !== "null";
  const hasRating = rating && rating !== "" && rating !== "null";
  const hasReviews = reviews && reviews !== "" && reviews !== "null";
  const priceNum = hasPrice ? parseFloat(price) : null;
  const ratingNum = hasRating ? parseFloat(rating) : null;
  const reviewsNum = hasReviews ? parseInt(reviews) : null;

  useEffect(() => {
    if (fetchedImages.length > 0 || !source) return;
    if (source !== "amazon" && source !== "google_shopping") return;

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

    let cancelled = false;

    const fetchImages = async () => {
      setLoadingImages(true);
      try {
        const res = await fetch("/api/platforms/product-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asin: extractedAsin, url: link, source }),
        });
        const data = await res.json();
        if (!cancelled && data.images && data.images.length > 0) {
          setFetchedImages(data.images);
        }
      } catch {}
      if (!cancelled) setLoadingImages(false);
    };

    fetchImages();
    return () => { cancelled = true; };
  }, [asin, link, source, fetchedImages.length]);

  useEffect(() => {
    if (!title || title === "Product") return;

    const fetchEnrichment = async () => {
      setLoadingEnrichment(true);
      try {
        const res = await fetch("/api/products/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, source, price: priceNum }),
        });
        const data = await res.json();
        if (data.platforms) {
          setEnrichmentData(data);
        }
      } catch {}
      setLoadingEnrichment(false);
    };

    fetchEnrichment();
  }, [title, source, priceNum]);

  useEffect(() => {
    if (!title || title === "Product") return;

    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const res = await fetch("/api/products/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: link, source, title, rating: ratingNum, reviews: reviewsNum }),
        });
        const data = await res.json();
        if (data.averageRating !== undefined) {
          setReviewData(data);
        }
      } catch {}
      setLoadingReviews(false);
    };

    fetchReviews();
  }, [title, link, source, ratingNum, reviewsNum]);

  useEffect(() => {
    if (!title || title === "Product") return;

    const fetchMarketIntel = async () => {
      setLoadingMarketIntel(true);
      try {
        const res = await fetch("/api/products/market-intel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, price: priceNum, rating: ratingNum, reviews: reviewsNum }),
        });
        const data = await res.json();
        if (data.searchVolume) {
          setMarketIntelData(data);
        }
      } catch {}
      setLoadingMarketIntel(false);
    };

    fetchMarketIntel();
  }, [title, priceNum, ratingNum, reviewsNum]);

  useEffect(() => {
    if (!title || title === "Product") return;

    const fetchListing = async () => {
      setLoadingListing(true);
      try {
        const res = await fetch("/api/products/listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, category, price: priceNum, platform: source }),
        });
        const data = await res.json();
        if (data.title) {
          setListingData(data);
        }
      } catch {}
      setLoadingListing(false);
    };

    fetchListing();
  }, [title, category, priceNum, source]);

  const enriched = useMemo(() => {
    if (enrichmentData?.platforms) {
      const platformsRaw = enrichmentData.platforms as { platform: string; price: number; rating: number; reviews: number; inStock: boolean; url: string }[];
      const platforms = platformsRaw.map((p) => ({ ...p, sparkline: [p.price * 0.95, p.price, p.price * 1.02, p.price * 0.98, p.price * 1.01, p.price * 0.97, p.price] }));
      const cheapest = enrichmentData.cheapest as { platform: string; price: number } | null;
      const supplierMatchesRaw = (enrichmentData.supplierMatches || []) as { id: string; name: string; trustBadge: string; location: string; flag: string; price: number; shippingToUS: string; shippingToEU: string; reliabilityScore: number; responseTime: string }[];
      const supplierMatches = supplierMatchesRaw.map((s) => ({ ...s, trustBadge: s.trustBadge as "gold" | "silver" | "bronze" }));

      const basePriceForCalc = cheapest?.price || priceNum || 29.99;
      const baseRatingForCalc = ratingNum || 4.3;
      const baseReviewsForCalc = reviewsNum || 1000;
      const priceSpreadNum = typeof enrichmentData.priceSpread === "number" ? enrichmentData.priceSpread : 0;

      const realReviewsData = reviewData && typeof reviewData.averageRating === "number" ? {
        averageRating: reviewData.averageRating as number,
        totalReviews: (reviewData.totalReviews as number) || baseReviewsForCalc,
        distribution: (reviewData.distribution as { stars: number; percent: number }[]) || [],
        sentiment: (reviewData.sentiment as { positive: string[]; neutral: string[]; negative: string[] }) || { positive: [], neutral: [], negative: [] },
        topKeywords: (reviewData.topKeywords as string[]) || [],
        commonComplaints: (reviewData.commonComplaints as string[]) || [],
        commonPraise: (reviewData.commonPraise as string[]) || [],
        trustworthyScore: (reviewData.trustworthyScore as number) || 0,
      } : null;

      const realMarketIntel = marketIntelData && typeof marketIntelData.searchVolume === "string" ? {
        searchVolume: marketIntelData.searchVolume as "high" | "medium" | "low",
        searchVolumeNumber: (marketIntelData.searchVolumeNumber as number) || 0,
        trendDirection: (marketIntelData.trendDirection as "rising" | "stable" | "declining") || "stable",
        trendSparkline: (marketIntelData.trendSparkline as number[]) || [],
        seasonality: (marketIntelData.seasonality as string) || "",
        bestTimeToSell: (marketIntelData.bestTimeToSell as string) || "",
        competitionLevel: (marketIntelData.competitionLevel as "low" | "medium" | "high" | "very-high") || "medium",
        estimatedSellers: (marketIntelData.estimatedSellers as number) || 0,
        avgSellerRating: (marketIntelData.avgSellerRating as number) || 0,
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
        platformTips: (listingData.platformTips as { platform: string; tip: string }[]) || [],
      } : null;

      return {
        platforms,
        cheapest: cheapest || { platform: "N/A", price: basePriceForCalc },
        mostExpensive: enrichmentData.mostExpensive || { platform: "N/A", price: basePriceForCalc },
        priceSpread: priceSpreadNum,
        bestRating: [...platforms].sort((a, b) => b.rating - a.rating)[0] || { platform: "N/A", rating: baseRatingForCalc },
        reviewsData: realReviewsData,
        marketIntel: realMarketIntel,
        listingSuggestion: realListingSuggestion,
        supplierMatches,
      };
    }

    return {
      platforms: priceNum ? [{ platform: source, price: priceNum, rating: ratingNum || 0, reviews: reviewsNum || 0, inStock: true, url: link, sparkline: [priceNum] }] : [],
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
        trustworthyScore: (reviewData.trustworthyScore as number) || 0,
      } : null,
      marketIntel: marketIntelData && typeof marketIntelData.searchVolume === "string" ? {
        searchVolume: marketIntelData.searchVolume as "high" | "medium" | "low",
        searchVolumeNumber: (marketIntelData.searchVolumeNumber as number) || 0,
        trendDirection: (marketIntelData.trendDirection as "rising" | "stable" | "declining") || "stable",
        trendSparkline: (marketIntelData.trendSparkline as number[]) || [],
        seasonality: (marketIntelData.seasonality as string) || "",
        bestTimeToSell: (marketIntelData.bestTimeToSell as string) || "",
        competitionLevel: (marketIntelData.competitionLevel as "low" | "medium" | "high" | "very-high") || "medium",
        estimatedSellers: (marketIntelData.estimatedSellers as number) || 0,
        avgSellerRating: (marketIntelData.avgSellerRating as number) || 0,
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
        platformTips: (listingData.platformTips as { platform: string; tip: string }[]) || [],
      } : null,
      supplierMatches: [],
    };
  }, [enrichmentData, reviewData, marketIntelData, listingData, title, source, priceNum, ratingNum, reviewsNum, link]);

  return (
    <div className="page-atmosphere max-w-5xl mx-auto space-y-6 md:space-y-8 pb-20 md:pb-28 relative z-10">
      {/* Back navigation */}
      <Link href="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Search
      </Link>

      {/* === SECTION 1: HERO SHOWCASE === */}
      <div ref={heroRef} className={`hero-glow transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
          {/* Image column */}
          <div className="space-y-3">
            <ImageGallery images={images} title={title} />
            {loadingImages && (
              <div className="flex items-center gap-2 text-xs text-accent">
                <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span>Fetching all product images...</span>
              </div>
            )}
            {images.length > 1 && !loadingImages && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Images className="h-3 w-3" />
                <span>{images.length} images available from {source.replace("_", " ")}</span>
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
              <div className="price-hero">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 font-medium">Listed Price</p>
                <p className="font-display text-4xl sm:text-5xl font-bold gradient-text-blue tracking-tight">${priceNum!.toFixed(2)}</p>
              </div>
            )}

            {/* Rating Badge */}
            {(hasRating || hasReviews) && (
              <div className="rating-badge">
                <div className="flex flex-wrap items-center gap-3">
                  {hasRating && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${s <= Math.round(ratingNum!) ? "text-amber-400 fill-current" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                      <span className="font-display text-xl font-bold text-foreground">{ratingNum!.toFixed(1)}</span>
                    </div>
                  )}
                  {hasReviews && <span className="text-sm text-muted-foreground">{reviewsNum!.toLocaleString()} reviews</span>}
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
              <a href={link} target="_blank" rel="noopener noreferrer" className="btn-hero-cta flex items-center justify-center gap-2">
                <ShoppingCart className="h-4 w-4" /> View on {source.replace("_", " ")} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <ProductActionBar platform={source} platformUrl={link} productTitle={title} category={category} />

      {/* === SECTION 2: PRICE COMPARISON === */}
      <section id="price-comparison" className="section-group">
        <p className="section-label mb-2">Pricing</p>
        {loadingEnrichment && (
          <div className="glass rounded-2xl p-3 border border-border mb-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Searching platforms for real prices...</span>
            </div>
          </div>
        )}
        <PriceComparison platforms={enriched.platforms} listedPrice={priceNum || 0} />
      </section>

      {/* === SECTION 3: PROFIT CALCULATOR === */}
      <section id="calculator" className="section-group">
        <p className="section-label mb-2">Financials</p>
        <ProfitCalculator sourcePrice={enriched.cheapest?.price || priceNum || 29.99} sellPrice={priceNum ? priceNum * 2.2 : 59.99} />
      </section>

      {/* === SECTION 4: MARKET INTELLIGENCE === */}
      <section className="section-group">
        <p className="section-label mb-2">Intelligence</p>
        <MarketIntelligence data={enriched.marketIntel} />
      </section>

      {/* === SECTION 5: REVIEW INTELLIGENCE === */}
      <section className="section-group">
        <p className="section-label mb-2">Social Proof</p>
        <ReviewIntelligence data={enriched.reviewsData} />
      </section>

      {/* === SECTION 6: SOURCING RECOMMENDATIONS === */}
      <section className="section-group">
        <p className="section-label mb-2">Sourcing</p>
        <SupplierMatchSection suppliers={enriched.supplierMatches} productTitle={title} category={category} />
      </section>

      {/* === SECTION 7: LISTING OPTIMIZATION === */}
      <section className="section-group">
        <p className="section-label mb-2">Optimization</p>
        <ListingOptimization data={enriched.listingSuggestion} platform={source} />
      </section>

      {/* === SECTION 8: SIMILAR & RELATED PRODUCTS === */}
      <section className="section-group">
        <p className="section-label mb-2">Discovery</p>
        <SimilarProducts category={category} title={title} currentPrice={priceNum || undefined} />
      </section>

      {/* === SECTION 9: SUGGESTED SEARCHES === */}
      <div className="relative rounded-2xl p-5 border border-border/50 bg-surface/30">
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
    <Suspense fallback={<div className="max-w-5xl mx-auto flex items-center justify-center py-20"><div className="text-center"><div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-sm text-muted-foreground">Loading product...</p></div></div>}>
      <ProductDetailContent />
    </Suspense>
  );
}
