"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Flame, TrendingUp, ShoppingCart, Package } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI } from "@/hooks/useAPI";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";

export interface TrendingSectionProduct {
  id: string;
  name: string;
  fullName: string;
  category: string;
  price: number;
  sellPrice: number | null;
  profit: number | null;
  margin: number | null;
  platform: string;
  platformId: string;
  link: string;
  trend: number | null;
  sparkline: number[] | null;
  confidence: number | null;
  demandLevel: "low" | "medium" | "high" | null;
  competitionLevel: "low" | "medium" | "high" | null;
  image: string;
  tags: string[];
  rating: number | null;
  reviews: number | null;
}

export default function TrendingSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const router = useRouter();
  const { data, isLoading: loading } = useAPI<{ products?: TrendingSectionProduct[] }>("/api/products/trending");
  const products = data?.products || [];

  const viewProduct = (product: TrendingSectionProduct) => {
    sessionStorage.setItem("selectedProduct", JSON.stringify({
      id: product.id,
      title: product.fullName,
      price: product.price,
      image: product.image,
      images: product.image ? [product.image] : [],
      link: product.link || "#",
      source: product.platformId,
      category: product.category,
      tags: product.tags,
      rating: product.rating,
      reviews: product.reviews,
    }));
    const params = new URLSearchParams({
      t: product.fullName,
      p: String(product.price),
      src: product.platformId,
    });
    if (product.image) params.set("img", product.image);
    if (product.link) params.set("link", product.link);
    if (product.rating != null) params.set("r", String(product.rating));
    if (product.reviews != null) params.set("rev", String(product.reviews));
    if (product.category) params.set("cat", product.category);
    if (product.tags?.length) params.set("tags", product.tags.join(","));
    router.push(`/products/${product.id}?${params.toString()}`);
  };

  const demandConfig: Record<string, { label: string; cls: string }> = {
    low: { label: "Low", cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    medium: { label: "Med", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    high: { label: "High", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  };
  const compConfig: Record<string, { label: string; cls: string }> = {
    low: { label: "Low", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
    medium: { label: "Med", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    high: { label: "High", cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  };
  const rankGradients = [
    "from-yellow-400 to-amber-500", "from-slate-300 to-slate-400",
    "from-orange-400 to-orange-500", "from-blue-400/60 to-blue-500",
    "from-purple-400/60 to-purple-500", "from-pink-400/60 to-purple-500",
  ];

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent-warm" aria-hidden="true" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Fresh from live search</h3>
            <p className="text-[10px] text-muted-foreground">Latest live search results (price ascending)</p>
          </div>
          {products.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-warm/10 text-accent-warm font-medium animate-pulse-badge">
              {products.length} live
            </span>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center">
          <Package className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">No live search results available right now</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Try searching for products above</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product, i) => {
            const demand = product.demandLevel ? demandConfig[product.demandLevel] : undefined;
            const comp = product.competitionLevel ? compConfig[product.competitionLevel] : undefined;
            const rankBg = rankGradients[Math.min(i, rankGradients.length - 1)];
            return (
              <div key={product.id} className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="glass-card-animated rounded-2xl overflow-hidden group hover:ring-1 hover:ring-accent/30 transition-all duration-300 flex flex-col h-full">
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); viewProduct(product); }} aria-label={`View ${product.name}`} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-inset">
                    <div className="relative aspect-[3/4] bg-surface overflow-hidden">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-muted-foreground/20" aria-hidden="true" />
                        </div>
                      )}
                      <div className={`absolute top-2 left-2 w-7 h-7 rounded-lg bg-gradient-to-br ${rankBg} flex items-center justify-center shadow-lg`} aria-hidden="true">
                        <span className="text-[10px] font-black text-white">#{i + 1}</span>
                      </div>
                      <div className="absolute top-2 right-2">
                        {product.trend != null && (
                          <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                            <TrendingUp className="h-2.5 w-2.5 text-emerald-400" aria-hidden="true" />
                            +{product.trend}%
                          </span>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" aria-hidden="true" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                        <div className="flex items-center gap-1">
                          {demand && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${demand.cls}`}>{demand.label}</span>}
                          {comp && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${comp.cls}`}>{comp.label}</span>}
                        </div>
                        <span className="text-[9px] text-white/80 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">{product.platform}</span>
                      </div>
                    </div>
                  </button>

                  <div className="p-3 flex flex-col flex-1">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); viewProduct(product); }} aria-label={`View ${product.name}`} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded">
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight mb-1.5 min-h-[2rem]">{product.name}</p>
                    </button>

                    <div className="mt-auto space-y-2">
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-emerald-400">
                            ${(product.price ?? 0).toFixed(2)}
                            {product.profit != null && (
                              <span title="Estimated from sell price − source price when available" className="text-[10px] font-normal text-muted-foreground"> <span className="line-through">${(product.sellPrice ?? 0).toFixed(2)}</span> ~${product.profit.toFixed(2)} profit est.</span>
                            )}
                          </p>
                        </div>
                        {product.margin != null && (
                          <span title="Estimated margin — enter real COGS in the calculator for accuracy" className="text-[10px] text-muted-foreground bg-surface/80 px-1.5 py-0.5 rounded-full">{product.margin}% est.</span>
                        )}
                      </div>

                      <div className="h-px bg-border/50" aria-hidden="true" />

                      {product.confidence != null && (
                        <div title="Estimated score from live search signals — not an AI market prediction" className="flex items-center gap-1.5">
                          <Flame className="h-3 w-3 text-accent-warm shrink-0" aria-hidden="true" />
                          <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400" style={{ width: `${product.confidence}%` }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground shrink-0">{product.confidence} est.</span>
                        </div>
                      )}

                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); viewProduct(product); }}
                        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                        View Product
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
