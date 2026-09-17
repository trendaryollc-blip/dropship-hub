"use client";

import { useState, useMemo } from "react";
import { Eye, Star, ChevronDown, Check, X, AlertTriangle } from "lucide-react";
import type { PlatformType, GeneratedListing } from "@/types/product-listing";
import type { AlgorithmCheck } from "@/types/listing-intelligence";

interface ListingPreviewProps {
  listing: GeneratedListing;
  platform: PlatformType;
  price?: number;
  images?: string[];
  brand?: string;
  specifications?: Record<string, string>;
}

function AlgorithmCheckItem({ check }: { check: AlgorithmCheck }) {
  return (
    <div className={`flex items-start gap-2 text-[10px] ${check.passed ? "text-emerald-400" : check.impact === "critical" ? "text-red-400" : "text-amber-400"}`}>
      {check.passed ? <Check className="h-3 w-3 mt-0.5 shrink-0" /> : check.impact === "critical" ? <X className="h-3 w-3 mt-0.5 shrink-0" /> : <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />}
      <div>
        <span className="font-medium">{check.rule}</span>
        {check.suggestion && !check.passed && <span className="text-muted-foreground"> — {check.suggestion}</span>}
      </div>
    </div>
  );
}

function AmazonPreview({ listing, price, images, brand }: ListingPreviewProps) {
  return (
    <div className="bg-white rounded-xl p-4 max-h-[500px] overflow-y-auto">
      <div className="flex gap-4">
        <div className="w-48 shrink-0">
          {images && images.length > 0 ? (
            <div className="space-y-1.5">
              <img src={images[0]} alt="" className="w-full aspect-square object-contain rounded-lg" />
              <div className="flex gap-1">
                {images.slice(1, 5).map((img, i) => (
                  <img key={i} src={img} alt="" className="w-10 h-10 object-contain rounded border border-gray-200" />
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">No image</div>
          )}
        </div>
        <div className="flex-1">
          {brand && <p className="text-xs text-blue-600 hover:underline cursor-pointer mb-1">{brand}</p>}
          <h2 className="text-sm font-medium text-gray-900 leading-snug mb-1">{listing.title}</h2>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`h-3 w-3 ${s <= 4 ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
            ))}
            <span className="text-[10px] text-blue-600 ml-1">12,847 ratings</span>
          </div>
          {price && (
            <div className="mb-2">
              <span className="text-xs text-gray-500">-</span>
              <span className="text-lg font-medium text-gray-900 ml-1">${price.toFixed(2)}</span>
            </div>
          )}
          {listing.bulletPoints.length > 0 && (
            <ul className="space-y-1 mb-3">
              {listing.bulletPoints.map((bp, i) => (
                <li key={i} className="text-[11px] text-gray-700 flex items-start gap-1">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{bp}</span>
                </li>
              ))}
            </ul>
          )}
          {listing.description && (
            <div className="text-[11px] text-gray-600 leading-relaxed">
              {listing.description.slice(0, 300)}{listing.description.length > 300 && "..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShopifyPreview({ listing, price, images, brand }: ListingPreviewProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
      {images && images[0] ? (
        <img src={images[0]} alt="" className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No image</div>
      )}
      <div className="p-4">
        {brand && <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{brand}</p>}
        <h2 className="text-base font-medium text-gray-900 mb-1">{listing.title}</h2>
        {price && (
          <p className="text-lg font-bold text-gray-900 mb-3">${price.toFixed(2)}</p>
        )}
        {listing.description && (
          <p className="text-xs text-gray-600 leading-relaxed mb-3">
            {listing.description.slice(0, 200)}{listing.description.length > 200 && "..."}
          </p>
        )}
        <button className="w-full py-2.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors">
          Add to Cart
        </button>
      </div>
    </div>
  );
}

function EbayPreview({ listing, price, images, brand }: ListingPreviewProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
      <div className="flex gap-3 p-4">
        {images && images[0] ? (
          <img src={images[0]} alt="" className="w-32 h-32 object-contain rounded-lg shrink-0" />
        ) : (
          <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs shrink-0">No image</div>
        )}
        <div className="flex-1">
          <h2 className="text-sm font-medium text-gray-900 leading-snug mb-1">{listing.title}</h2>
          {price && <p className="text-lg font-bold text-gray-900 mb-2">${price.toFixed(2)}</p>}
          {brand && <p className="text-[10px] text-gray-500 mb-1">Brand: {brand}</p>}
          <p className="text-[10px] text-green-600 font-medium">Free shipping</p>
        </div>
      </div>
    </div>
  );
}

function EtsyPreview({ listing, price, images, brand }: ListingPreviewProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
      {images && images[0] ? (
        <img src={images[0]} alt="" className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No image</div>
      )}
      <div className="p-4">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{brand || "Handmade item"}</p>
        <h2 className="text-sm font-medium text-gray-900 mb-1">{listing.title}</h2>
        {price && <p className="text-base font-bold text-gray-900 mb-2">${price.toFixed(2)}</p>}
        <p className="text-[10px] text-gray-600 mb-2">⭐ 4.8 (2,341 reviews)</p>
        <button className="w-full py-2 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors">
          Add to cart
        </button>
      </div>
    </div>
  );
}

function WalmartPreview({ listing, price, images, brand }: ListingPreviewProps) {
  return (
    <div className="bg-white rounded-xl p-4 max-h-[500px] overflow-y-auto">
      <div className="flex gap-4">
        {images && images[0] ? (
          <img src={images[0]} alt="" className="w-32 h-32 object-contain rounded-lg shrink-0" />
        ) : (
          <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs shrink-0">No image</div>
        )}
        <div className="flex-1">
          {brand && <p className="text-[10px] text-gray-500 mb-1">{brand}</p>}
          <h2 className="text-sm font-medium text-gray-900 leading-snug mb-1">{listing.title}</h2>
          {price && <p className="text-lg font-bold text-gray-900 mb-2">${price.toFixed(2)}</p>}
          <p className="text-[10px] text-green-600 font-medium">Free 90-day returns</p>
        </div>
      </div>
    </div>
  );
}

const PREVIEW_COMPONENTS: Record<string, React.FC<ListingPreviewProps>> = {
  amazon: AmazonPreview,
  shopify: ShopifyPreview,
  ebay: EbayPreview,
  etsy: EtsyPreview,
  walmart: WalmartPreview,
};

export default function ListingPreview({ listing, platform, price, images, brand, specifications }: ListingPreviewProps) {
  const [showAlgorithm, setShowAlgorithm] = useState(false);

  const PreviewComponent = PREVIEW_COMPONENTS[platform] || AmazonPreview;

  const algorithmChecks = useMemo<AlgorithmCheck[]>(() => {
    const checks: AlgorithmCheck[] = [];
    const titleLen = listing.title.length;
    const descLen = listing.description.length;

    if (platform === "amazon") {
      checks.push({ rule: "Title length (150-200 chars)", passed: titleLen >= 150 && titleLen <= 200, impact: "high", suggestion: titleLen < 150 ? "Add more keywords to title" : "Trim title to under 200 chars" });
      checks.push({ rule: "5 bullet points", passed: listing.bulletPoints.length >= 5, impact: "critical", suggestion: "Amazon requires 5 bullet points" });
      checks.push({ rule: "Bullet points under 200 chars", passed: listing.bulletPoints.every((bp) => bp.length <= 200), impact: "medium" });
      checks.push({ rule: "Backend keywords present", passed: !!(listing as any).backendKeywords?.length, impact: "high" });
      checks.push({ rule: "Description over 200 chars", passed: descLen >= 200, impact: "medium" });
    } else if (platform === "shopify") {
      checks.push({ rule: "SEO-friendly title (under 70 chars)", passed: titleLen <= 70, impact: "high", suggestion: "Keep title under 70 chars for SEO" });
      checks.push({ rule: "Rich description (500+ chars)", passed: descLen >= 500, impact: "medium" });
      checks.push({ rule: "Bullet points present", passed: listing.bulletPoints.length > 0, impact: "medium" });
    } else if (platform === "ebay") {
      checks.push({ rule: "Title under 80 characters", passed: titleLen <= 80, impact: "critical", suggestion: "eBay enforces 80-char limit" });
      checks.push({ rule: "Concise description", passed: descLen <= 4000, impact: "medium" });
    } else if (platform === "etsy") {
      checks.push({ rule: "Title under 140 characters", passed: titleLen <= 140, impact: "high" });
      checks.push({ rule: "Has gift-related language", passed: listing.title.toLowerCase().includes("gift") || listing.description.toLowerCase().includes("gift"), impact: "low", suggestion: "Etsy buyers search for gifts" });
      checks.push({ rule: "13 SEO tags max", passed: listing.seoTags.length <= 13, impact: "medium" });
    } else if (platform === "walmart") {
      checks.push({ rule: "Title under 75 characters", passed: titleLen <= 75, impact: "critical" });
      checks.push({ rule: "Structured description", passed: descLen >= 300, impact: "medium" });
    }

    checks.push({ rule: "Has SEO tags", passed: listing.seoTags.length > 0, impact: "medium" });
    checks.push({ rule: `Optimization score ≥ 80%`, passed: listing.optimizationScore >= 80, impact: "high" });

    return checks;
  }, [listing, platform]);

  const passedCount = algorithmChecks.filter((c) => c.passed).length;
  const totalCount = algorithmChecks.length;

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-accent" />
            <p className="text-xs font-semibold text-foreground">{platform.charAt(0).toUpperCase() + platform.slice(1)} Preview</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${listing.optimizationScore >= 80 ? "bg-emerald-400/10 text-emerald-400" : listing.optimizationScore >= 50 ? "bg-amber-400/10 text-amber-400" : "bg-red-400/10 text-red-400"}`}>
              {listing.optimizationScore}%
            </span>
          </div>
        </div>
        <PreviewComponent listing={listing} platform={platform} price={price} images={images} brand={brand} specifications={specifications} />
      </div>

      <button
        onClick={() => setShowAlgorithm(!showAlgorithm)}
        className="w-full glass rounded-xl px-3 py-2 flex items-center justify-between hover:border-accent/20 transition-all"
      >
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${passedCount === totalCount ? "bg-emerald-400/20 text-emerald-400" : "bg-amber-400/20 text-amber-400"}`}>
            {passedCount}/{totalCount}
          </div>
          <span className="text-[11px] font-medium text-foreground">Algorithm Compliance</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showAlgorithm ? "rotate-180" : ""}`} />
      </button>

      {showAlgorithm && (
        <div className="glass rounded-xl p-3 space-y-2">
          {algorithmChecks.map((check, i) => (
            <AlgorithmCheckItem key={i} check={check} />
          ))}
        </div>
      )}
    </div>
  );
}
