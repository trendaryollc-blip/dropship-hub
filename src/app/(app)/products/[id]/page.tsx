"use client";

import { useParams } from "next/navigation";
import { getProductById } from "@/lib/mock-data";
import Link from "next/link";
import {
  ArrowLeft, Star, TrendingUp, TrendingDown, AlertTriangle, Zap,
  Truck, Shield, Globe, BarChart3, ExternalLink, ShoppingCart,
  Calculator, Users, Target, ChevronRight,
} from "lucide-react";

const riskColors = { low: "text-emerald-400", medium: "text-amber-400", high: "text-red-400" };
const riskBg = { low: "bg-emerald-400/10", medium: "bg-amber-400/10", high: "bg-red-400/10" };
const badgeColors = { gold: "bg-amber-400/10 text-amber-400 border-amber-400/20", silver: "bg-gray-300/10 text-gray-300 border-gray-300/20", bronze: "bg-orange-400/10 text-orange-400 border-orange-400/20" };

export default function ProductDetailPage() {
  const params = useParams();
  const product = getProductById(params.id as string);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">Product not found</h2>
        <Link href="/products" className="text-accent hover:text-accent-hover text-sm font-medium">
          Back to search
        </Link>
      </div>
    );
  }

  const lowestPrice = Math.min(...product.platformPrices.map((p) => p.price));
  const highestPrice = Math.max(...product.platformPrices.map((p) => p.price));
  const riskLevel: "low" | "medium" | "high" = product.riskScore < 30 ? "low" : product.riskScore < 50 ? "medium" : "high";

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <Link href="/products" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Products
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{product.title}</span>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Images + Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image gallery */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="aspect-video bg-surface relative">
              <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 flex gap-2">
                {product.trending && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent/90 text-white text-xs font-bold backdrop-blur-sm">
                    <TrendingUp className="h-3.5 w-3.5" /> Trending
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm ${riskBg[riskLevel]} ${riskColors[riskLevel]}`}>
                  <AlertTriangle className="h-3.5 w-3.5" /> Risk {product.riskScore}/100
                </span>
              </div>
            </div>
            <div className="flex gap-2 p-3">
              {product.images.map((img, i) => (
                <div key={i} className={`w-20 h-20 rounded-xl overflow-hidden bg-surface border-2 ${i === 0 ? "border-accent" : "border-transparent"} cursor-pointer`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Product info */}
          <div className="glass rounded-2xl p-6">
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">{product.category}</p>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{product.title}</h1>
            <p className="text-muted-foreground leading-relaxed mb-6">{product.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {product.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-lg bg-surface border border-border text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Star, label: "Rating", value: product.averageRating.toString(), color: "text-amber-400" },
                { icon: Users, label: "Reviews", value: product.totalReviews.toLocaleString(), color: "text-blue-400" },
                { icon: TrendingUp, label: "Search Vol", value: product.searchVolume.toLocaleString(), color: "text-purple-400" },
                { icon: Target, label: "Competition", value: product.competitionLevel.replace("-", " "), color: "text-pink-400" },
              ].map((m) => (
                <div key={m.label} className="p-3 rounded-xl bg-surface/50 border border-border">
                  <m.icon className={`h-4 w-4 ${m.color} mb-1.5`} />
                  <p className="font-display text-sm font-bold text-foreground">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cross-platform pricing */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent" /> Cross-Platform Pricing
            </h3>
            <div className="space-y-3">
              {product.platformPrices.map((pp) => (
                <div key={pp.platform} className="flex items-center gap-4 p-4 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center font-display text-sm font-bold text-foreground">
                    {pp.platform.slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{pp.platform}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-muted-foreground">{pp.rating} ({pp.reviews.toLocaleString()})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-display text-lg font-bold ${pp.price === lowestPrice ? "text-emerald-400" : "text-foreground"}`}>
                      ${pp.price.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className={`h-2 w-2 rounded-full ${pp.inStock ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className="text-[10px] text-muted-foreground">{pp.inStock ? "In Stock" : "Out of Stock"}</span>
                    </div>
                  </div>
                  <a href={pp.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-emerald-400/5 border border-emerald-400/20">
              <p className="text-sm text-emerald-400 font-medium">
                Best margin: ${lowestPrice.toFixed(2)} on {product.platformPrices.find((p) => p.price === lowestPrice)?.platform} vs ${highestPrice.toFixed(2)} retail = +${(highestPrice - lowestPrice).toFixed(2)} profit per unit
              </p>
            </div>
          </div>

          {/* Suppliers */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-accent" /> Available Suppliers
            </h3>
            <div className="space-y-3">
              {product.suppliers.map((s) => (
                <div key={s.id} className="p-4 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display text-sm font-semibold text-foreground">{s.name}</h4>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${badgeColors[s.trustBadge]}`}>
                          {s.trustBadge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-foreground">{s.reliabilityScore}</p>
                      <p className="text-[10px] text-muted-foreground">Reliability</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Shipping", value: `${s.shippingDays} days` },
                      { label: "Rating", value: `${s.rating} / 5` },
                      { label: "Orders", value: `${s.orderCompletionRate}%` },
                      { label: "Disputes", value: `${s.disputeRate}%` },
                    ].map((m) => (
                      <div key={m.label} className="text-center p-2 rounded-lg bg-background/50">
                        <p className="text-xs font-medium text-foreground">{m.value}</p>
                        <p className="text-[9px] text-muted-foreground uppercase">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions sidebar */}
        <div className="space-y-4">
          {/* Price summary */}
          <div className="glass rounded-2xl p-6 sticky top-24">
            <div className="text-center mb-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Best Sourcing Price</p>
              <p className="font-display text-4xl font-bold text-foreground">${lowestPrice.toFixed(2)}</p>
              <p className="text-sm text-emerald-400 font-medium mt-1">
                Potential margin: +${(highestPrice - lowestPrice).toFixed(2)}
              </p>
            </div>

            <div className="space-y-2.5">
              <Link
                href={`/suppliers?product=${product.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.98]"
              >
                <Truck className="h-4 w-4" /> Find Suppliers
              </Link>
              <Link
                href={`/calculator?product=${product.id}&cost=${lowestPrice}&price=${highestPrice}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-warm hover:bg-accent-warm-hover text-white font-semibold text-sm transition-all active:scale-[0.98]"
              >
                <Calculator className="h-4 w-4" /> Calculate Profit
              </Link>
              <Link
                href={`/competitors?product=${product.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface border border-border hover:bg-surface-hover text-foreground font-medium text-sm transition-all"
              >
                <BarChart3 className="h-4 w-4" /> View Competitors
              </Link>
              <Link
                href={`/store?push=${product.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface border border-border hover:bg-surface-hover text-foreground font-medium text-sm transition-all"
              >
                <ShoppingCart className="h-4 w-4" /> Push to Store
              </Link>
            </div>

            {/* Quick stats */}
            <div className="mt-6 pt-6 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Market Trend</span>
                <span className={`flex items-center gap-1 font-medium ${product.marketTrend === "rising" ? "text-emerald-400" : product.marketTrend === "declining" ? "text-red-400" : "text-amber-400"}`}>
                  {product.marketTrend === "rising" ? <TrendingUp className="h-3.5 w-3.5" /> : product.marketTrend === "declining" ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                  {product.marketTrend}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Seasonality</span>
                <span className="font-medium text-foreground">{product.seasonality}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Risk Score</span>
                <span className={`font-medium ${riskColors[riskLevel]}`}>{product.riskScore}/100</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profit Potential</span>
                <span className={`font-medium ${product.profitPotential === "high" ? "text-emerald-400" : product.profitPotential === "medium" ? "text-amber-400" : "text-red-400"}`}>
                  {product.profitPotential}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platforms</span>
                <span className="font-medium text-foreground">{product.platformPrices.length} listed</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Suppliers</span>
                <span className="font-medium text-foreground">{product.suppliers.length} available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
