"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search, TrendingUp, Package, ChevronLeft, ChevronRight, ArrowUpRight,
  Plus, ExternalLink, Info, Star, BookmarkPlus, BookmarkCheck,
  CheckCircle2, FileText, GitBranch,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { SectionDivider } from "./SectionDivider";
import { MiniSparkline } from "./MiniSparkline";
import type { TrendingProduct } from "@/types/dashboard";

export function ProductDiscovery({ trending, onAddCompare, onSaveProduct, isProductSaved, onViewProduct }: { trending: TrendingProduct[]; onAddCompare: (item: { name: string; price: number; margin: number; image: string }) => void; onSaveProduct: (product: TrendingProduct) => void; isProductSaved: (name: string) => boolean; onViewProduct: (product: TrendingProduct) => void }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => { el.removeEventListener("scroll", checkScroll); window.removeEventListener("resize", checkScroll); };
  }, [trending.length]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 320;
    el.scrollBy({ left: dir === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Product Discovery" icon={Search} />
      <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Trending Products</span>
            {trending.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium animate-pulse">{trending.length} hot</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {trending.length > 3 && (
              <div className="flex items-center gap-1">
                <button onClick={() => scroll("left")} disabled={!canScrollLeft} aria-label="Scroll left"
                  className={`p-1.5 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${canScrollLeft ? "bg-white/[0.06] border-white/[0.1] text-white hover:bg-white/[0.1]" : "bg-white/[0.02] border-white/[0.04] text-gray-600 cursor-not-allowed"}`}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => scroll("right")} disabled={!canScrollRight} aria-label="Scroll right"
                  className={`p-1.5 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${canScrollRight ? "bg-white/[0.06] border-white/[0.1] text-white hover:bg-white/[0.1]" : "bg-white/[0.02] border-white/[0.04] text-gray-600 cursor-not-allowed"}`}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <Link href="/products" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {trending.length === 0 ? (
          <div className="text-center py-12 text-[11px] text-gray-600">No trending products right now</div>
        ) : (
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth snap-x snap-mandatory">
            {trending.map((product, index) => (
              <div key={`${product.name}-${index}`}
                className="group flex-none w-[280px] sm:w-[300px] lg:w-[320px] snap-start rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-500 hover:shadow-[0_8px_40px_-12px_rgba(0,200,255,0.12)] overflow-hidden">
                {/* Image */}
                <div className="relative h-40 bg-gradient-to-br from-purple-500/15 to-blue-500/10 overflow-hidden">
                  {product.image ? (
                    <Image src={product.image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="320px" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><Package className="h-12 w-12 text-purple-400/30" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-[9px] font-bold text-white uppercase">{product.platform}</div>
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400">+{product.trend}%</span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <MiniSparkline data={product.sparkline} color="#22c55e" width={140} height={20} />
                  </div>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddCompare({ name: product.name, price: product.price, margin: product.margin, image: product.image }); }}
                    aria-label={`Add ${product.name} to compare`}
                    className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {/* Info */}
                <div className="p-4">
                  <h4 className="text-xs font-semibold text-white line-clamp-2 mb-2 min-h-[2.5rem]">{product.name}</h4>
                  {product.whyTrending && (
                    <p className="text-[10px] text-gray-500 line-clamp-1 mb-3 flex items-center gap-1">
                      <Info className="h-3 w-3 shrink-0 text-cyan-400" />
                      {product.whyTrending}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-[8px] text-gray-500 uppercase">Price</p>
                      <p className="text-sm font-bold text-white">${product.price.toFixed(2)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                      <p className="text-[8px] text-emerald-400/70 uppercase">Est. Margin</p>
                      <p className="text-sm font-bold text-emerald-400">{product.margin}%</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-[8px] text-gray-500 uppercase">Score</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-white">{product.confidence}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${product.demandLevel === "high" ? "bg-emerald-500/15 text-emerald-400" : product.demandLevel === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-gray-500/15 text-gray-400"}`}>
                      est. {product.demandLevel} demand
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${product.competitionLevel === "low" ? "bg-emerald-500/15 text-emerald-400" : product.competitionLevel === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>
                      est. {product.competitionLevel} competition
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-gray-400">{product.shippingDays} days</span>
                  </div>
                  {product.competitors && product.competitors.length > 0 && (
                    <div className="text-[9px] text-gray-600 mb-3">
                      Competitors: {product.competitors.slice(0, 2).map(c => `${c.name} $${c.price.toFixed(2)}`).join(", ")}
                    </div>
                  )}
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewProduct(product); }}
                      aria-label={`View details for ${product.name}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-semibold hover:bg-cyan-500/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                      <ExternalLink className="h-3 w-3" />
                      View Product
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSaveProduct(product); }}
                      aria-label={isProductSaved(product.name) ? `Unsave ${product.name}` : `Save ${product.name}`}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${
                        isProductSaved(product.name)
                          ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
                          : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:text-white"
                      }`}>
                      {isProductSaved(product.name) ? (
                        <><BookmarkCheck className="h-3 w-3" /> Saved</>
                      ) : (
                        <><BookmarkPlus className="h-3 w-3" /> Save</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Feature Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {[
            { icon: BookmarkPlus, label: "Saved Products", href: "/saved", color: "blue", stat: "View" },
            { icon: CheckCircle2, label: "Validation", href: "/product-validation", color: "emerald", stat: "Test" },
            { icon: FileText, label: "Listings", href: "/product-listings", color: "purple", stat: "Optimize" },
            { icon: GitBranch, label: "Lifecycle", href: "/product-lifecycle", color: "amber", stat: "Track" },
          ].map((f) => {
            const cMap: Record<string, string> = { blue: "bg-blue-500/10 border-blue-500/20 text-blue-400", emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", purple: "bg-purple-500/10 border-purple-500/20 text-purple-400", amber: "bg-amber-500/10 border-amber-500/20 text-amber-400" };
            return (
              <Link key={f.href} href={f.href} className={`flex items-center gap-3 p-3 rounded-xl border ${cMap[f.color]} hover:bg-white/[0.04] transition-all duration-300 group`}>
                <f.icon className="h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-white truncate">{f.label}</p>
                  <p className="text-[9px] text-gray-500">{f.stat}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
