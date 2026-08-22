"use client";

import { useRouter } from "next/navigation";
import { Package, Star, Images } from "lucide-react";
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
}

export default function ListItemCard({ product, index }: { product: SearchResult; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.15 });
  const router = useRouter();

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
      style={{ transitionDelay: `${Math.min(index * 40, 300)}ms` }}
    >
      <a
        href={`/products/${product.id}`}
        onClick={handleClick}
        className="glass-card-animated rounded-xl flex items-center gap-4 p-3 group"
      >
        <div className="w-16 h-16 rounded-xl bg-surface overflow-hidden shrink-0 relative">
          {product.image ? (
            <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <Package className="h-6 w-6" />
            </div>
          )}
          {imageCount > 1 && (
            <span className="absolute bottom-0.5 right-0.5 px-1 py-0.5 rounded bg-black/60 text-white text-[8px] font-medium backdrop-blur-sm flex items-center gap-0.5">
              <Images className="h-2 w-2" /> {imageCount}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">{product.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              {platformIcons[product.source] || "\ud83d\udd17"} {product.source}
            </span>
            {product.rating != null && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Star className="h-2.5 w-2.5 text-amber-400 fill-current" />
                {product.rating.toFixed(1)}
              </span>
            )}
            {product.reviews != null && (
              <span className="text-[10px] text-muted-foreground">({product.reviews.toLocaleString()})</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          {product.price != null ? (
            <span className="text-base font-bold text-accent">${product.price.toFixed(2)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">N/A</span>
          )}
        </div>
      </a>
    </div>
  );
}
