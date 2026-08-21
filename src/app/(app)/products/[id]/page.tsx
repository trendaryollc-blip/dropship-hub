"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Star, ShoppingCart, Package } from "lucide-react";
import { Suspense } from "react";

const platformIcons: Record<string, string> = {
  amazon: "📦",
  ebay: "🏷️",
  aliexpress: "🇨🇳",
  cj: "🚚",
  google_shopping: "🔍",
  keepa: "📊",
  walmart: "🏪",
  temu: "🔥",
  shein: "👗",
  etsy: "🎨",
  alibaba: "🏭",
  banggood: "⚡",
  dhgate: "🔗",
};

function ProductDetailContent() {
  const searchParams = useSearchParams();

  const title = searchParams.get("t") || "Product";
  const price = searchParams.get("p");
  const image = searchParams.get("img");
  const link = searchParams.get("link") || "#";
  const source = searchParams.get("src") || "unknown";
  const rating = searchParams.get("r");
  const reviews = searchParams.get("rev");

  const hasPrice = price && price !== "" && price !== "null";
  const hasRating = rating && rating !== "" && rating !== "null";
  const hasReviews = reviews && reviews !== "" && reviews !== "null";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Search
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="glass rounded-2xl overflow-hidden border border-border">
          {image ? (
            <div className="aspect-square bg-surface relative">
              <img
                src={image}
                alt={title}
                className="w-full h-full object-contain p-4"
              />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5">
                {platformIcons[source] || "🔗"} {source.replace("_", " ")}
              </span>
            </div>
          ) : (
            <div className="aspect-square bg-surface flex items-center justify-center">
              <Package className="h-24 w-24 text-muted-foreground/20" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-muted-foreground mb-3">
              {platformIcons[source] || "🔗"} {source.replace("_", " ")}
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">
              {title}
            </h1>
          </div>

          {/* Price */}
          {hasPrice && (
            <div className="glass rounded-xl p-5 border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Price</p>
              <p className="font-display text-4xl font-bold text-accent">
                ${parseFloat(price).toFixed(2)}
              </p>
            </div>
          )}

          {/* Rating */}
          {(hasRating || hasReviews) && (
            <div className="glass rounded-xl p-5 border border-border">
              <div className="flex items-center gap-4">
                {hasRating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-400 fill-current" />
                    <span className="font-display text-xl font-bold text-foreground">
                      {parseFloat(rating).toFixed(1)}
                    </span>
                    {hasReviews && (
                      <span className="text-sm text-muted-foreground">
                        ({reviews} reviews)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.97]"
            >
              <ShoppingCart className="h-4 w-4" />
              View on {source.replace("_", " ")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link
              href="/products"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-surface border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all"
            >
              Search More
            </Link>
          </div>

          {/* Source info */}
          <div className="glass rounded-xl p-4 border border-border">
            <p className="text-xs text-muted-foreground">
              This product was found via <span className="text-foreground font-medium">{source.replace("_", " ")}</span>. 
              Click &quot;View on {source.replace('_', ' ')}&quot; to see the full listing and purchase options on the original marketplace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading product...</p>
        </div>
      </div>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}
