"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Package, Sparkles, ExternalLink, Star } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { safeFetch } from "@/lib/safe-fetch";

interface SimilarProduct {
  title: string;
  price: number;
  image: string | null;
  platform: string;
  link: string;
  rating?: number;
  reviews?: number;
}

function SimilarCard({ product, index }: { product: SimilarProduct; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`group similar-card ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 80}ms` }}>
      <a href={product.link} target="_blank" rel="noopener noreferrer" className="block">
        <div className="similar-image-wrap h-36 bg-gradient-to-br from-surface to-muted/20 border-b border-border/30 flex items-center justify-center">
          {product.image ? (
            <Image src={product.image} alt={product.title} width={400} height={144} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <Package className="h-10 w-10 text-muted-foreground/20" />
          )}
        </div>
        <div className="p-3.5">
          <h4 className="text-xs font-semibold text-foreground line-clamp-2 mb-2 leading-relaxed">{product.title}</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold gradient-text-blue">${product.price.toFixed(2)}</span>
            <span className="text-[10px] text-muted-foreground capitalize">{product.platform.replace("_", " ")}</span>
          </div>
          {(product.rating || product.reviews) && (
            <div className="flex items-center gap-1.5 mt-2">
              {product.rating && (
                <div className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 text-amber-400 fill-current" />
                  <span className="text-[10px] text-foreground font-medium">{product.rating}</span>
                </div>
              )}
              {product.reviews && (
                <span className="text-[10px] text-muted-foreground">({product.reviews.toLocaleString()})</span>
              )}
            </div>
          )}
        </div>
      </a>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
          <ExternalLink className="h-3 w-3 text-white" />
        </div>
      </div>
    </div>
  );
}

function BoughtTogetherCard({ product, index }: { product: SimilarProduct; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div ref={ref} className={`bought-together-card transition-all ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${index * 80}ms` }}>
      <a href={product.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-surface to-muted/20 border border-border/50 flex items-center justify-center shrink-0 overflow-hidden">
          {product.image ? (
            <Image src={product.image} alt={product.title} width={64} height={64} unoptimized className="w-full h-full object-cover" />
          ) : (
            <Package className="h-5 w-5 text-muted-foreground/30" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-foreground line-clamp-1 mb-1">{product.title}</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold gradient-text-blue">${product.price.toFixed(2)}</span>
            {product.rating && (
              <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5 fill-current" /> {product.rating}
              </span>
            )}
          </div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
      </a>
    </div>
  );
}

export default function SimilarProducts({ category, title, currentPrice }: { category?: string; title?: string; currentPrice?: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [similar, setSimilar] = useState<SimilarProduct[]>([]);
  const [boughtTogether, setBoughtTogether] = useState<SimilarProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!title && !category) return;

    let cancelled = false;

    const fetchSimilar = async () => {
      setLoading(true);
      try {
        const data = await safeFetch<{ similar?: SimilarProduct[]; boughtTogether?: SimilarProduct[] }>("/api/products/similar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, category, currentPrice }),
        });
        if (!cancelled) {
          if (data.similar) setSimilar(data.similar);
          if (data.boughtTogether) setBoughtTogether(data.boughtTogether);
        }
      } catch {
        // Silently handle fetch errors
      }
      if (!cancelled) setLoading(false);
    };

    fetchSimilar();
    return () => { cancelled = true; };
  }, [title, category, currentPrice]);

  return (
    <div ref={ref} className={`intel-card transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Header */}
      <div className="p-5 border-b border-border/50 flex items-center gap-3">
        <div className="icon-container-pink">
          <Sparkles className="h-4 w-4 text-pink-400" />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Similar & Related Products</h3>
          <p className="text-[10px] text-muted-foreground">Explore more in this category</p>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {loading && similar.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-3.5 w-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span>Searching for similar products...</span>
          </div>
        )}

        {similar.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 font-medium">Similar Products</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {similar.map((p, i) => <SimilarCard key={`${p.title}-${i}`} product={p} index={i} />)}
            </div>
          </div>
        )}

        {boughtTogether.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Frequently Bought Together</p>
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {boughtTogether.map((p, i) => <BoughtTogetherCard key={`${p.title}-${i}`} product={p} index={i} />)}
            </div>
          </div>
        )}

        {!loading && similar.length === 0 && boughtTogether.length === 0 && (
          <div className="text-center py-8">
            <div className="icon-container-pink mx-auto mb-3">
              <Package className="h-5 w-5 text-pink-400" />
            </div>
            <p className="text-xs text-muted-foreground">No similar products found for this category</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Try browsing related categories</p>
          </div>
        )}
      </div>
    </div>
  );
}
