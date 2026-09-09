"use client";

import Link from "next/link";
import { Sparkles, TrendingUp, DollarSign, Zap, Target, ArrowRight, Flame, Star } from "lucide-react";
import { useInView } from "@/hooks/useInView";

interface Collection {
  id: string;
  title: string;
  subtitle: string;
  query: string;
  icon: typeof Sparkles;
  gradient: string;
  border: string;
  color: string;
  badge?: string;
}

const COLLECTIONS: Collection[] = [
  {
    id: "hot-under-50",
    title: "Hot Under $50",
    subtitle: "Trending products with high demand under $50",
    query: "trending popular bestseller under 50",
    icon: Flame,
    gradient: "from-orange-500/15 to-red-500/10",
    border: "border-orange-500/20",
    color: "text-orange-400",
    badge: "Trending",
  },
  {
    id: "low-competition",
    title: "Low Competition Winners",
    subtitle: "Underserved niches with high profit potential",
    query: "niche unique low competition high margin",
    icon: Target,
    gradient: "from-emerald-500/15 to-green-500/10",
    border: "border-emerald-500/20",
    color: "text-emerald-400",
    badge: "Hidden Gems",
  },
  {
    id: "high-margin",
    title: "High Margin Products",
    subtitle: "Products with 40%+ profit margins",
    query: "high profit margin premium quality",
    icon: DollarSign,
    gradient: "from-violet-500/15 to-purple-500/10",
    border: "border-violet-500/20",
    color: "text-violet-400",
    badge: "40%+",
  },
  {
    id: "electronics",
    title: "Trending Electronics",
    subtitle: "Hot tech gadgets selling fast",
    query: "trending electronics gadget technology 2024",
    icon: Zap,
    gradient: "from-blue-500/15 to-cyan-500/10",
    border: "border-blue-500/20",
    color: "text-blue-400",
    badge: "Hot",
  },
  {
    id: "best-rated",
    title: "Top Rated Finds",
    subtitle: "4.5+ star products across all platforms",
    query: "best rated top quality highly reviewed",
    icon: Star,
    gradient: "from-amber-500/15 to-yellow-500/10",
    border: "border-amber-500/20",
    color: "text-amber-400",
    badge: "4.5+ Stars",
  },
  {
    id: "viral-potential",
    title: "Viral Potential",
    subtitle: "Products with social media buzz",
    query: "viral trending social media TikTok Instagram popular",
    icon: TrendingUp,
    gradient: "from-pink-500/15 to-rose-500/10",
    border: "border-pink-500/20",
    color: "text-pink-400",
    badge: "Viral",
  },
];

export default function AICollections() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">AI Curated Collections</h3>
          <p className="text-[10px] text-muted-foreground">Smart product collections based on market data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {COLLECTIONS.map((collection, i) => (
          <div
            key={collection.id}
            className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            <Link
              href={`/products?q=${encodeURIComponent(collection.query)}`}
              className={`group relative flex items-start gap-3 p-4 rounded-2xl border ${collection.gradient} ${collection.border} text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] block`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${collection.gradient} ${collection.color} group-hover:scale-110 transition-transform`}>
                <collection.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${collection.color}`}>{collection.title}</p>
                  {collection.badge && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[9px] font-medium text-muted-foreground">
                      {collection.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{collection.subtitle}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
