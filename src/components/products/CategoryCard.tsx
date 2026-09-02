"use client";

import Image from "next/image";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { ProductCategory } from "@/types/products-types";

export default function CategoryCard({ category, index }: { category: ProductCategory; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
    <a
      href={`/products?q=${encodeURIComponent(category.name)}`}
      className="group relative block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
    >
      <div className="relative h-32 overflow-hidden">
        <Image
          src={category.image}
          alt={category.name}
          width={400}
          height={128}
          unoptimized
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
        {category.trending && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-bold text-accent-warm bg-accent-warm/10 px-2 py-0.5 rounded-full border border-accent-warm/20 backdrop-blur-sm">
            <TrendingUp className="h-2.5 w-2.5" /> Hot
          </span>
        )}
      </div>
      <div className="relative p-4">
        <h3 className="font-display text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors flex items-center gap-1.5">
          {category.name}
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </h3>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] text-muted-foreground">{category.productCount.toLocaleString()} products</span>
          <span className="text-[10px] text-muted-foreground">~{category.avgMargin}% margin</span>
        </div>
      </div>
    </a>
    </div>
  );
}
