import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/product";
import { TrendingUp, Star, AlertTriangle, Zap, ArrowUpRight } from "lucide-react";

const riskColors = {
  low: "text-emerald-400 bg-emerald-400/10",
  medium: "text-amber-400 bg-amber-400/10",
  high: "text-red-400 bg-red-400/10",
};

const profitColors = {
  high: "text-emerald-400",
  medium: "text-amber-400",
  low: "text-red-400",
};

export default function ProductCard({ product }: { product: Product }) {
  const lowestPrice = Math.min(...product.platformPrices.map((p) => p.price));
  const highestPrice = Math.max(...product.platformPrices.map((p) => p.price));
  const margin = highestPrice - lowestPrice;

  const riskLevel: "low" | "medium" | "high" =
    product.riskScore < 30 ? "low" : product.riskScore < 50 ? "medium" : "high";

  return (
    <Link
      href={`/products/${product.id}`}
      className="group glass rounded-2xl overflow-hidden hover:border-accent/20 transition-all duration-300 hover:bg-surface-hover block"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-surface">
        <Image
          src={product.images[0]}
          alt={product.title}
          width={400}
          height={400}
          unoptimized
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.trending && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <TrendingUp className="h-2.5 w-2.5" /> Trending
            </span>
          )}
          {product.profitPotential === "high" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/90 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <Zap className="h-2.5 w-2.5" /> High Profit
            </span>
          )}
        </div>
        {/* Risk badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${riskColors[riskLevel]}`}>
            <AlertTriangle className="h-2.5 w-2.5" /> Risk {product.riskScore}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-1">
          {product.category}
        </p>
        <h3 className="font-display text-sm font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-accent transition-colors">
          {product.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          <span className="text-xs font-medium text-foreground">{product.averageRating}</span>
          <span className="text-xs text-muted-foreground">({product.totalReviews.toLocaleString()} reviews)</span>
        </div>

        {/* Price range */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Best price</p>
            <p className="font-display text-lg font-bold text-foreground">${lowestPrice.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground mb-0.5">Potential margin</p>
            <p className={`font-display text-sm font-bold ${profitColors[product.profitPotential]}`}>
              +${margin.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Platforms */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {product.platformPrices.slice(0, 3).map((pp) => (
            <span
              key={pp.platform}
              className="px-2 py-0.5 rounded-md bg-surface border border-border text-[10px] text-muted-foreground"
            >
              {pp.platform}
            </span>
          ))}
          {product.platformPrices.length > 3 && (
            <span className="px-2 py-0.5 rounded-md bg-surface border border-border text-[10px] text-muted-foreground">
              +{product.platformPrices.length - 3}
            </span>
          )}
        </div>

        {/* View arrow */}
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-accent transition-colors">
          View Details
          <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
