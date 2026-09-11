"use client";

import Link from "next/link";
import { Sparkles, TrendingUp, DollarSign, Zap, Target, Flame, Star } from "lucide-react";
import { useInView } from "@/hooks/useInView";

interface Collection {
  id: string;
  title: string;
  query: string;
  icon: typeof Sparkles;
  color: string;
  bg: string;
  border: string;
  badge?: string;
}

const COLLECTIONS: Collection[] = [
  {
    id: "hot-under-50",
    title: "Hot Under $50",
    query: "trending popular bestseller under 50",
    icon: Flame,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    badge: "Trending",
  },
  {
    id: "low-competition",
    title: "Low Competition",
    query: "niche unique low competition high margin",
    icon: Target,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    badge: "Hidden Gems",
  },
  {
    id: "high-margin",
    title: "High Margin 40%+",
    query: "high profit margin premium quality",
    icon: DollarSign,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
  },
  {
    id: "electronics",
    title: "Trending Electronics",
    query: "trending electronics gadget technology",
    icon: Zap,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    badge: "Hot",
  },
  {
    id: "best-rated",
    title: "Top Rated 4.5+",
    query: "best rated top quality highly reviewed",
    icon: Star,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    id: "viral-potential",
    title: "Viral Potential",
    query: "viral trending social media TikTok Instagram popular",
    icon: TrendingUp,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    badge: "Viral",
  },
];

export default function AICollections() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        <h3 className="text-xs font-semibold text-foreground">Quick Start</h3>
        <p className="text-[10px] text-muted-foreground ml-1">Curated collections</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {COLLECTIONS.map((collection, i) => (
          <div
            key={collection.id}
            className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <Link
              href={`/products?q=${encodeURIComponent(collection.query)}`}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${collection.bg} ${collection.border} ${collection.color} text-xs font-medium hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 group`}
            >
              <collection.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{collection.title}</span>
              {collection.badge && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-muted-foreground font-medium">
                  {collection.badge}
                </span>
              )}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
