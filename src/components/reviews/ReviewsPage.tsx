"use client";

import { useState, useCallback } from "react";
import {
  Star,
  Download,
  Loader2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Filter,
  Image,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import type { ProductReview, ReviewSource, ReviewStats, ReviewImportJobDoc } from "@/types/reviews";

const SOURCES: { id: ReviewSource; label: string; color: string; icon: string }[] = [
  { id: "aliexpress", label: "AliExpress", color: "text-red-400", icon: "🛒" },
  { id: "cj", label: "CJ Dropshipping", color: "text-blue-400", icon: "📦" },
  { id: "amazon", label: "Amazon", color: "text-amber-400", icon: "📋" },
  { id: "ebay", label: "eBay", color: "text-emerald-400", icon: "🏷️" },
];

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${sizeClass} ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [loading, setLoading] = useState(false);
  const [productTitle, setProductTitle] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [source, setSource] = useState<ReviewSource>("aliexpress");
  const [maxReviews, setMaxReviews] = useState(10);
  const [filterSource, setFilterSource] = useState<ReviewSource | "all">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const { data: statsData, mutate: mutateStats } = useAPI<{ stats: ReviewStats }>("/api/reviews?type=stats");
  const { data: reviewsData, mutate: mutateReviews } = useAPI<{ reviews: ProductReview[] }>(
    `/api/reviews?type=list${filterSource !== "all" ? `&source=${filterSource}` : ""}`
  );
  const { data: jobsData } = useAPI<{ jobs: ReviewImportJobDoc[] }>("/api/reviews?type=jobs");

  const handleImport = useCallback(async () => {
    if (!productTitle.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", productTitle, productUrl, source, maxReviews }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      success(`Imported ${data.imported} reviews from ${SOURCES.find(s => s.id === source)?.label}`);
      mutateStats();
      mutateReviews();
      setProductTitle("");
      setProductUrl("");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }, [productTitle, productUrl, source, maxReviews, success, showError, mutateStats, mutateReviews]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    success("Copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/reviews?id=${id}`, { method: "DELETE" });
      success("Review deleted");
      mutateStats();
      mutateReviews();
    } catch (err) {
      showError("Delete failed");
    }
  }, [success, showError, mutateStats, mutateReviews]);

  const stats = statsData?.stats;
  const reviews = reviewsData?.reviews || [];
  const jobs = jobsData?.jobs || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="h-6 w-6 text-accent" />
          Review Importer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import reviews from suppliers and sync them to your stores.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Reviews", value: stats.totalReviews, icon: Star },
            { label: "Avg Rating", value: stats.averageRating, icon: Star, suffix: "★" },
            { label: "With Images", value: stats.withImages, icon: Image },
            { label: "This Week", value: stats.recentImports, icon: Clock },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground uppercase">{s.label}</span>
                <s.icon className="h-3 w-3 text-accent" />
              </div>
              <div className="font-display text-lg font-bold text-foreground">{s.value}{(s as any).suffix || ""}</div>
            </div>
          ))}
        </div>
      )}

      {/* Import Form */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Download className="h-4 w-4 text-accent" />
          Import Reviews
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Name *</label>
            <input type="text" value={productTitle} onChange={(e) => setProductTitle(e.target.value)}
              placeholder="e.g. Wireless Bluetooth Earbuds"
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product URL</label>
            <input type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://aliexpress.com/item/..."
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Source</label>
            <div className="flex gap-1.5">
              {SOURCES.map((s) => (
                <button key={s.id} onClick={() => setSource(s.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    source === s.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  <span>{s.icon}</span>
                  {s.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Max Reviews</label>
            <input type="number" value={maxReviews} onChange={(e) => setMaxReviews(Number(e.target.value))}
              min={1} max={50}
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
        </div>
        <button onClick={handleImport} disabled={!productTitle.trim() || loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Import Reviews
        </button>
      </div>

      {/* Rating Distribution */}
      {stats && stats.totalReviews > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Rating Distribution</h3>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingDistribution[rating] || 0;
              const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-3">{rating}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <button onClick={() => setFilterSource("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterSource === "all" ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
          All
        </button>
        {SOURCES.map((s) => (
          <button key={s.id} onClick={() => setFilterSource(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterSource === s.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
            {s.icon} {s.label.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-2">
        {reviews.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Star className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No reviews imported yet</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="glass rounded-xl p-4 hover:border-accent/10 transition-all group">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <StarRating rating={review.rating} />
                    <span className="text-xs text-muted-foreground">by {review.author}</span>
                    {review.verified && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                      </span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">
                      {SOURCES.find(s => s.id === review.source)?.icon} {review.source}
                    </span>
                  </div>
                  {review.title && <h4 className="text-sm font-semibold text-foreground mb-0.5">{review.title}</h4>}
                  <p className="text-sm text-foreground/80 line-clamp-2">{review.content}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">{review.helpful} found helpful</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      review.syncStatus === "synced" ? "bg-emerald-500/10 text-emerald-400" :
                      review.syncStatus === "pending" ? "bg-amber-500/10 text-amber-400" :
                      review.syncStatus === "failed" ? "bg-red-500/10 text-red-400" :
                      "bg-surface text-muted-foreground"
                    }`}>{review.syncStatus}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleCopy(review.content, review.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all">
                    {copied === review.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(review.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
