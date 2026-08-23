"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Package, Heart, Plus, Star, Images, Check } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const platformIcons: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", keepa: "\ud83d\udcca",
  walmart: "\ud83c\udfea", temu: "\ud83d\udd25", shein: "\ud83d\udc57",
  etsy: "\ud83c\udfa8", alibaba: "\ud83c\udfed", banggood: "\u26a1", dhgate: "\ud83d\udd17",
};

interface SearchResult {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  images?: string[];
  link: string;
  source: string;
  rating?: number;
  reviews?: number;
  asin?: string;
}

export default function EnrichedProductCard({ product, index }: { product: SearchResult; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.15 });
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [compared, setCompared] = useState(false);

  const imageCount = product.images?.length || (product.image ? 1 : 0);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    sessionStorage.setItem("selectedProduct", JSON.stringify(product));
    router.push(`/products/${product.id}`);
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      <a
        href={`/products/${product.id}`}
        onClick={handleClick}
        className="glass-card-animated rounded-2xl overflow-hidden group block"
      >
        <div className="aspect-square bg-surface relative overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <Package className="h-12 w-12" />
            </div>
          )}
          <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm flex items-center gap-1 max-w-[calc(100%-16px)] truncate">
            {platformIcons[product.source] || "\ud83d\udd17"} {product.source}
          </span>
          {imageCount > 1 && (
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm flex items-center gap-1">
              <Images className="h-2.5 w-2.5" /> {imageCount}
            </span>
          )}
          <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSaved(!saved); }}
              className={`p-2.5 rounded-lg backdrop-blur-sm transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${saved ? "bg-accent text-white" : "bg-black/60 text-white hover:bg-accent/80"}`}
              title={saved ? "Remove from favorites" : "Save to favorites"}
            >
              <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCompared(!compared); }}
              className={`p-2.5 rounded-lg backdrop-blur-sm transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${compared ? "bg-emerald-500 text-white" : "bg-black/60 text-white hover:bg-accent/80"}`}
              title={compared ? "Remove from compare" : "Add to compare"}
            >
              {compared ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-accent transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center justify-between">
            {product.price != null ? (
              <span className="text-lg font-bold text-accent">${product.price.toFixed(2)}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Price N/A</span>
            )}
            {product.rating != null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 text-amber-400 fill-current" />
                {product.rating.toFixed(1)}
                {product.reviews != null && <span>({product.reviews.toLocaleString()})</span>}
              </span>
            )}
          </div>
        </div>
      </a>
    </div>
  );
}
