"use client";

import { useMemo } from "react";
import { Heart, DollarSign, Star, Globe } from "lucide-react";
import { useSavedProducts } from "./SavedProductsProvider";

export default function SavedStatsBar() {
  const { savedProducts } = useSavedProducts();

  const stats = useMemo(() => {
    if (savedProducts.length === 0) return null;

    const prices = savedProducts.filter((p) => p.price != null).map((p) => p.price!);
    const ratings = savedProducts.filter((p) => p.rating != null).map((p) => p.rating!);

    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    const platformCounts: Record<string, number> = {};
    for (const p of savedProducts) {
      platformCounts[p.source] = (platformCounts[p.source] || 0) + 1;
    }
    const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return { avgPrice, avgRating, topPlatform };
  }, [savedProducts]);

  if (!stats) return null;

  const cards = [
    {
      icon: Heart,
      label: "Total Saved",
      value: savedProducts.length.toString(),
      color: "text-pink-400",
      bg: "bg-pink-400/10 border-pink-400/20",
    },
    {
      icon: DollarSign,
      label: "Avg. Price",
      value: stats.avgPrice != null ? `$${stats.avgPrice.toFixed(2)}` : "N/A",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10 border-emerald-400/20",
    },
    {
      icon: Star,
      label: "Avg. Rating",
      value: stats.avgRating != null ? stats.avgRating.toFixed(1) : "N/A",
      color: "text-amber-400",
      bg: "bg-amber-400/10 border-amber-400/20",
    },
    {
      icon: Globe,
      label: "Top Platform",
      value: stats.topPlatform ?? "N/A",
      color: "text-blue-400",
      bg: "bg-blue-400/10 border-blue-400/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="glass rounded-xl p-4 flex items-center gap-3 hover:border-accent/20 transition-all"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${card.bg}`}>
            <card.icon className={`h-4.5 w-4.5 ${card.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground truncate">{card.label}</p>
            <p className="font-display text-lg font-bold text-foreground truncate">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
