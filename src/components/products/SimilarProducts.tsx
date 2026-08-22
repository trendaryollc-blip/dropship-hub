"use client";

import { Package, Sparkles } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { trendingProducts } from "@/lib/mock-dashboard";

function SimilarCard({ product, index }: { product: typeof trendingProducts[0]; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`group glass rounded-xl border border-border p-3 hover:border-accent/20 transition-all cursor-pointer ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${index * 80}ms` }}>
      <div className="w-full h-28 rounded-lg bg-gradient-to-br from-surface to-muted/20 border border-border/50 mb-3 flex items-center justify-center overflow-hidden">
        <Package className="h-8 w-8 text-muted-foreground/30" />
      </div>
      <h4 className="text-xs font-semibold text-foreground line-clamp-2 mb-1">{product.name}</h4>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-emerald-400">${product.price.toFixed(2)}</span>
        <span className="text-[10px] text-muted-foreground">{product.margin}% margin</span>
      </div>
    </div>
  );
}

function BoughtTogetherCard({ product, index }: { product: typeof trendingProducts[0]; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div ref={ref} className={`glass rounded-xl border border-border p-3 transition-all ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${index * 80}ms` }}>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-surface to-muted/20 border border-border/50 flex items-center justify-center shrink-0 overflow-hidden">
          <Package className="h-5 w-5 text-muted-foreground/30" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-foreground line-clamp-1">{product.name}</h4>
          <span className="text-xs font-bold text-emerald-400">${product.price.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default function SimilarProducts({ category }: { category?: string }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const similar = trendingProducts.filter((p) => p.price > 10).slice(0, 4);
  const boughtTogether = trendingProducts.filter((p) => p.price < 50).slice(0, 3);

  return (
    <div ref={ref} className={`glass rounded-2xl border border-border overflow-hidden transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-pink-400/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-pink-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Similar & Related Products</h3>
            <p className="text-[10px] text-muted-foreground">Explore more in this category</p>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-5">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Similar Products</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {similar.map((p, i) => <SimilarCard key={p.name} product={p} index={i} />)}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Frequently Bought Together</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {boughtTogether.map((p, i) => <BoughtTogetherCard key={p.name} product={p} index={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
