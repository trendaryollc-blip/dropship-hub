"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Sparkles, Clock, ArrowRight, TrendingUp, Star, Package, Search, Trash2,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SearchHistoryEntry } from "@/hooks/useSearchHistory";

interface SmartFeedProps {
  history: SearchHistoryEntry[];
  smartRecommendations: Array<Record<string, unknown>>;
  interestProfile: {
    topSources: string[];
    topCategories: string[];
    avgPrice: number | null;
    totalClicked: number;
  } | null;
  onSearchRecent: (query: string) => void;
  onClearHistory: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const platformEmojis: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", walmart: "\ud83c\udfea",
  etsy: "\ud83c\udfa8", temu: "\ud83d\udce8", shein: "\ud83d\udc57",
  banggood: "\ud83d\udcb0", dhgate: "\ud83d\udce2", alibaba: "\ud83c\udf10",
};

function RecommendedCard({ product, index }: { product: Record<string, unknown>; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const router = useRouter();

  const title = (product.title as string) || "Untitled Product";
  const price = product.price as number | null;
  const image = product.image as string | null;
  const source = (product.source as string) || "";
  const rating = product.rating as number | undefined;
  const reviews = product.reviews as number | undefined;
  const goldenScore = product.goldenScore as number | undefined;
  const id = (product.id as string) || title;

  const handleClick = () => {
    const params = new URLSearchParams({ t: title, src: source });
    if (price != null) params.set("p", String(price));
    if (image) params.set("img", image);
    if (product.link) params.set("link", product.link as string);
    if (rating != null) params.set("r", String(rating));
    if (reviews != null) params.set("rev", String(reviews));
    sessionStorage.setItem("selectedProduct", JSON.stringify({ ...product, id }));
    router.push(`/products/${id}?${params.toString()}`);
  };

  return (
    <div
      ref={ref}
      className={`group cursor-pointer transition-all duration-500 ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{ transitionDelay: `${index * 60}ms` }}
      onClick={handleClick}
    >
      <div className="glass rounded-2xl border border-border/50 overflow-hidden hover:border-accent/25 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300">
        <div className="relative h-36 bg-gradient-to-br from-surface to-muted/20 overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={title}
              width={300}
              height={144}
              unoptimized
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}
          {goldenScore != null && goldenScore >= 80 && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-400/90 text-black text-[10px] font-bold">
              Golden {goldenScore}
            </div>
          )}
        </div>
        <div className="p-3">
          <h4 className="text-xs font-semibold text-foreground line-clamp-2 mb-2 leading-relaxed min-h-[2rem]">
            {title}
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold gradient-text-blue">
              ${(price || 0).toFixed(2)}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs">{platformEmojis[source] || "\ud83d\udce6"}</span>
              <span className="text-[10px] text-muted-foreground capitalize">{source.replace("_", " ")}</span>
            </div>
          </div>
          {(rating != null || reviews != null) && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {rating != null && (
                <div className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 text-amber-400 fill-current" />
                  <span className="text-[10px] text-foreground font-medium">{rating}</span>
                </div>
              )}
              {reviews != null && (
                <span className="text-[10px] text-muted-foreground">({reviews.toLocaleString()})</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentSearchCard({ entry, onSearch, index }: { entry: SearchHistoryEntry; onSearch: (q: string) => void; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const topProducts = entry.results.slice(0, 3);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <button
        onClick={() => onSearch(entry.query)}
        className="w-full text-left glass rounded-2xl border border-border/50 p-4 hover:border-accent/25 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 group"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 shrink-0">
              <Search className="h-3.5 w-3.5 text-accent" />
            </div>
            <span className="text-sm font-semibold text-foreground line-clamp-1">{entry.query}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
              <Clock className="h-3 w-3" /> {formatTimeAgo(entry.timestamp)}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-muted-foreground">{entry.results.length} products</span>
          {entry.clickedProductIds.length > 0 && (
            <span className="text-[10px] text-accent font-medium">{entry.clickedProductIds.length} viewed</span>
          )}
          <div className="flex-1" />
          {entry.platforms.slice(0, 4).map((p) => (
            <span key={p} className="text-xs">{platformEmojis[p] || "\ud83d\udce6"}</span>
          ))}
        </div>

        {topProducts.length > 0 && (
          <div className="flex gap-2">
            {topProducts.map((p, i) => (
              <div key={i} className="flex-1 h-16 rounded-lg bg-surface/50 border border-border/30 overflow-hidden">
                {p.image ? (
                  <Image src={p.image as string} alt="" width={80} height={64} unoptimized className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground/20" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </button>
    </div>
  );
}

export default function SmartFeed({ history, smartRecommendations, interestProfile, onSearchRecent, onClearHistory }: SmartFeedProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const hasHistory = history.length > 0;
  const hasRecommendations = smartRecommendations.length > 0;

  if (!hasHistory) return null;

  return (
    <div className="space-y-6">
      {/* Smart Recommendations */}
      {hasRecommendations && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                <Sparkles className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">Recommended for You</span>
                {interestProfile && (
                  <p className="text-[10px] text-muted-foreground">
                    Based on {interestProfile.totalClicked} product{interestProfile.totalClicked !== 1 ? "s" : ""} you viewed
                    {interestProfile.topSources.length > 0 && (
                      <> &middot; {interestProfile.topSources.slice(0, 2).map((s) => s.replace("_", " ")).join(", ")}</>
                    )}
                  </p>
                )}
              </div>
            </div>
            {interestProfile && interestProfile.topCategories.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5">
                {interestProfile.topCategories.slice(0, 2).map((cat) => (
                  <span key={cat} className="text-[10px] px-2 py-1 rounded-lg bg-accent/10 text-accent border border-accent/20">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {smartRecommendations.slice(0, 8).map((product, i) => (
              <RecommendedCard key={(product.id as string) || i} product={product} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10">
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <span className="text-sm font-semibold text-foreground">Recent Searches</span>
          </div>
          {hasHistory && (
            <div className="relative">
              <button
                onClick={() => setShowClearConfirm(!showClearConfirm)}
                className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-400/5"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
              {showClearConfirm && (
                <div className="absolute right-0 top-full mt-1 z-50 glass rounded-xl border border-border p-3 shadow-2xl w-48">
                  <p className="text-xs text-muted-foreground mb-2">Clear all search history?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onClearHistory(); setShowClearConfirm(false); }}
                      className="flex-1 text-[10px] px-2 py-1.5 rounded-lg bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20 transition-colors font-medium"
                    >
                      Clear all
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 text-[10px] px-2 py-1.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {history.slice(0, 5).map((entry, i) => (
            <RecentSearchCard key={`${entry.query}-${entry.timestamp}`} entry={entry} onSearch={onSearchRecent} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
