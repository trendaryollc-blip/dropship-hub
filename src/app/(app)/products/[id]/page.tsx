"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, ExternalLink, Star, ShoppingCart, Package,
  TrendingUp, Shield, Truck, Clock, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Images, Tag, Barcode, Layers,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { enrichProduct } from "@/lib/mock-enrichment";
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

const suggestedSearches = [
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
      <div className="glass rounded-2xl overflow-hidden border border-border">
        <div className="aspect-[4/3] sm:aspect-square bg-surface relative cursor-zoom-in" onClick={() => setLightboxOpen(true)}>
          <img src={images[activeIndex]} alt={`${title} - Image ${activeIndex + 1}`} className="w-full h-full object-contain p-4 hover:scale-110 transition-transform duration-300" />
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-lg bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-lg bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                {activeIndex + 1} / {images.length}
              </span>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-1 p-2 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {images.map((img, i) => (
              <button key={i} onClick={() => setActiveIndex(i)} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${i === activeIndex ? "border-accent" : "border-transparent opacity-60 hover:opacity-100"}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <img src={images[activeIndex]} alt={title} className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center">
            <ChevronRight className="h-6 w-6" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-white/10 text-white text-sm backdrop-blur-sm">
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
  const asin = product?.asin || product?.id || "";

  const storedImages = product?.images || (image ? [image] : []);
  const images = fetchedImages.length > 0 ? fetchedImages : storedImages;

  useEffect(() => {
    if (storedImages.length > 1 || !source) return;

    const fetchImages = async () => {
      setLoadingImages(true);
      try {
        const res = await fetch("/api/platforms/product-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asin, url: link, source }),
        });
        const data = await res.json();
        if (data.images && data.images.length > storedImages.length) {
          setFetchedImages(data.images);
        }
      } catch {}
      setLoadingImages(false);
    };

    fetchImages();
  }, [asin, link, source, storedImages.length]);

  const hasPrice = price && price !== "" && price !== "null";
  const hasRating = rating && rating !== "" && rating !== "null";
  const hasReviews = reviews && reviews !== "" && reviews !== "null";
  const priceNum = hasPrice ? parseFloat(price) : null;
  const ratingNum = hasRating ? parseFloat(rating) : null;
  const reviewsNum = hasReviews ? parseInt(reviews) : null;

  const enriched = useMemo(() => enrichProduct(title, source, priceNum, ratingNum || undefined, reviewsNum || undefined), [title, source, priceNum, ratingNum, reviewsNum]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-16 md:pb-24">
      <ProductActionBar platform={source} platformUrl={link} productTitle={title} category={category} />

      <Link href="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Search
      </Link>

      {/* === SECTION 1: ENHANCED PRODUCT HERO === */}
      <div ref={heroRef} className={`grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
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

        <div className="space-y-3 sm:space-y-4">
          <div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs mb-3 ${platformColors[source] || "bg-surface border-border text-muted-foreground"}`}>
              {platformIcons[source] || "\ud83d\udd17"} {source.replace("_", " ")}
            </span>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight">{title}</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 rounded-lg bg-surface/50 border border-border/50 text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3" /> {category}
            </span>
            {tags.slice(0, 4).map((t) => (
              <span key={t} className="text-xs px-2 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent">{t}</span>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Barcode className="h-3.5 w-3.5" />
            <span>ID: {productId}</span>
          </div>

          {hasPrice && (
            <div className="glass rounded-xl p-4 sm:p-5 border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Listed Price</p>
              <p className="font-display text-3xl sm:text-4xl font-bold text-accent">${priceNum!.toFixed(2)}</p>
            </div>
          )}

          {(hasRating || hasReviews) && (
            <div className="glass rounded-xl p-4 border border-border">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {hasRating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-400 fill-current" />
                    <span className="font-display text-xl font-bold text-foreground">{ratingNum!.toFixed(1)}</span>
                  </div>
                )}
                {hasReviews && <span className="text-sm text-muted-foreground">({reviewsNum!.toLocaleString()} reviews)</span>}
                {hasRating && ratingNum && ratingNum >= 4.5 && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 font-medium border border-emerald-400/20">Top Rated</span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <a href={link} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.97]">
              <ShoppingCart className="h-4 w-4" /> View on {source.replace("_", " ")} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* === SECTION 2: PRICE COMPARISON === */}
      <section id="price-comparison">
        <PriceComparison platforms={enriched.platforms} listedPrice={priceNum || 0} />
      </section>

      {/* === SECTION 3: PROFIT CALCULATOR === */}
      <section id="calculator">
        <ProfitCalculator sourcePrice={enriched.cheapest.price} sellPrice={priceNum ? priceNum * 2.2 : 59.99} />
      </section>

      {/* === SECTION 4: MARKET INTELLIGENCE === */}
      <MarketIntelligence data={enriched.marketIntel} />

      {/* === SECTION 5: REVIEW INTELLIGENCE === */}
      <ReviewIntelligence data={enriched.reviewsData} />

      {/* === SECTION 6: SOURCING RECOMMENDATIONS === */}
      <SupplierMatchSection suppliers={enriched.supplierMatches} productTitle={title} category={category} />

      {/* === SECTION 7: LISTING OPTIMIZATION === */}
      <ListingOptimization data={enriched.listingSuggestion} platform={source} />

      {/* === SECTION 8: SIMILAR & RELATED PRODUCTS === */}
      <SimilarProducts category={category} />

      {/* === SECTION 9: SUGGESTED SEARCHES (kept from original) === */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" /> Suggested Searches
        </h3>
        <div className="flex flex-wrap gap-2">
          {suggestedSearches.map((s) => (
            <Link key={s} href={`/products?q=${encodeURIComponent(s)}`} className="text-xs px-3 py-1.5 rounded-lg bg-surface/50 border border-border text-muted-foreground hover:text-foreground hover:border-accent/20 hover:bg-accent/5 transition-all">{s}</Link>
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
