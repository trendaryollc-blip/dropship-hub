"use client";

import Link from "next/link";
import Image from "next/image";
import { Compass, TrendingUp, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI } from "@/hooks/useAPI";
import DataSourceBadge from "@/components/ui/DataSourceBadge";
import ComingSoon from "@/components/ui/ComingSoon";

export interface CategoriesSectionCategory {
  id: string;
  name: string;
  icon: string;
  image: string;
  productCount: number;
  avgMargin: number | null;
  trending: boolean;
  query: string;
}

export default function CategoriesSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const { data, isLoading: loading } = useAPI<{ categories?: CategoriesSectionCategory[] }>("/api/products/categories");
  const categories = data?.categories || [];

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Browse by Category</h3>
            <p className="text-[10px] text-muted-foreground">Live CJ product counts per category</p>
          </div>
          {!loading && categories.length > 0 && (
            <DataSourceBadge source="live" className="ml-1" />
          )}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
              <div className="h-32 bg-surface" />
              <div className="p-4 space-y-2"><div className="h-4 bg-surface rounded w-2/3" /><div className="h-3 bg-surface rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center">
          <Compass className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">No category data available</p>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <>
        <ComingSoon
          title="Category margins"
          whatNeeded="Average margin by category needs supplier cost data per product — not available from CJ category search alone."
          howToGet="Connect cost APIs or enter COGS in the calculator to estimate margins."
          className="mb-3"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <div key={cat.id} className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${i * 60}ms` }}>
              <Link href={`/products?q=${encodeURIComponent(cat.query)}`} className="group relative block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
                <div className="relative h-32 overflow-hidden bg-surface">
                  {cat.image ? (
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-muted/20">
                      <span className="text-5xl opacity-20" aria-hidden="true">{cat.icon}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" aria-hidden="true" />
                  {cat.trending && (
                    <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-bold text-accent-warm bg-accent-warm/10 px-2 py-0.5 rounded-full border border-accent-warm/20 backdrop-blur-sm">
                      <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" /> Hot
                    </span>
                  )}
                </div>
                <div className="relative p-4 bg-surface/50 border border-border/50 border-t-0 rounded-b-2xl">
                  <h3 className="font-display text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors flex items-center gap-1.5">
                    {cat.name}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground">{cat.productCount.toLocaleString()} products</span>
                    <span className="text-[10px] text-muted-foreground">margin n/a</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
