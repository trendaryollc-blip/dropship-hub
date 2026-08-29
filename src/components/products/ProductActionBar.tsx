"use client";

import { Heart, BarChart3, ExternalLink, Calculator, Award } from "lucide-react";
import { useSavedProducts, type SavedProduct } from "@/components/saved/SavedProductsProvider";

interface ProductActionBarProps {
  platform: string;
  platformUrl?: string;
  productTitle: string;
  category?: string;
  id?: string;
  price?: number | null;
  image?: string | null;
  images?: string[];
  rating?: number | null;
  reviews?: number | null;
}

export default function ProductActionBar({ platform, platformUrl, productTitle, category, id, price, image, images, rating, reviews }: ProductActionBarProps) {
  const { isSaved, toggleSave } = useSavedProducts();
  const savedProductId = id || productTitle;
  const saved = isSaved(savedProductId);

  const toggleFavorite = () => {
    const savedProduct: SavedProduct = {
      id: savedProductId,
      title: productTitle,
      price: price ?? null,
      image: image ?? null,
      images: images,
      link: platformUrl || "",
      source: platform,
      rating: rating ?? undefined,
      reviews: reviews ?? undefined,
      savedAt: Date.now(),
    };
    toggleSave(savedProduct);
  };

  return (
    <>
      {/* Desktop: frosted toolbar */}
      <div className="hidden md:block action-bar">
        <div className="flex items-center gap-1">
          <button onClick={toggleFavorite} className={`action-btn ${saved ? "action-btn-danger" : ""}`}>
            <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            <span className="hidden lg:inline">{saved ? "Saved" : "Save"}</span>
          </button>
          <a href="#price-comparison" className="action-btn">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden lg:inline">Compare</span>
          </a>
          <a href={`/suppliers?product=${encodeURIComponent(productTitle)}&category=${encodeURIComponent(category || "")}`} className="action-btn">
            <Award className="h-4 w-4" />
            <span className="hidden lg:inline">Suppliers</span>
          </a>
          <div className="w-px h-5 bg-border/50 mx-1 hidden lg:block" />
          <a href={platformUrl || "#"} target="_blank" rel="noopener noreferrer" className="action-btn">
            <ExternalLink className="h-4 w-4" />
            <span className="hidden lg:inline">{platform}</span>
          </a>
          <a href="#calculator" className="action-btn">
            <Calculator className="h-4 w-4" />
            <span className="hidden lg:inline">Analyze</span>
          </a>
        </div>
      </div>

      {/* Mobile: sticky bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="glass border-t border-border px-3 py-2 flex items-center gap-1.5">
          <button onClick={toggleFavorite} className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all ${saved ? "bg-red-400/10 text-red-400" : "text-muted-foreground active:bg-surface"}`}>
            <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            <span className="text-[9px]">{saved ? "Saved" : "Save"}</span>
          </button>
          <a href="#price-comparison" className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-muted-foreground active:bg-surface">
            <BarChart3 className="h-4 w-4" />
            <span className="text-[9px]">Compare</span>
          </a>
          <a href={`/suppliers?product=${encodeURIComponent(productTitle)}&category=${encodeURIComponent(category || "")}`} className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-muted-foreground active:bg-surface">
            <Award className="h-4 w-4" />
            <span className="text-[9px]">Suppliers</span>
          </a>
          <a href={platformUrl || "#"} target="_blank" rel="noopener noreferrer" className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-muted-foreground active:bg-surface">
            <ExternalLink className="h-4 w-4" />
            <span className="text-[9px]">{platform}</span>
          </a>
          <a href="#calculator" className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-muted-foreground active:bg-surface">
            <Calculator className="h-4 w-4" />
            <span className="text-[9px]">Analyze</span>
          </a>
        </div>
      </div>
    </>
  );
}
