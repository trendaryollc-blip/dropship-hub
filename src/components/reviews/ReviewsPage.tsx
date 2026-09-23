"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Star,
  Download,
  Loader2,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  Image,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  History,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import { authJson, getAuthHeaders } from "@/lib/auth-headers";
import { copyToClipboard } from "@/lib/clipboard";
import { safeFetch } from "@/lib/safe-fetch";
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
    <div className="flex gap-0.5" aria-label={`Rated ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${sizeClass} ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function DataState({
  isLoading,
  error,
  label,
  onRetry,
}: {
  isLoading: boolean;
  error: unknown;
  label: string;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto" />
        <p className="text-sm text-muted-foreground mt-2">Loading {label}…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-center border border-red-500/20">
        <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-foreground">Couldn&apos;t load {label}.</p>
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }
  return null;
}

const JOB_STATUS_BADGES: Record<string, string> = {
  pending: "bg-surface text-muted-foreground",
  scraping: "bg-blue-500/10 text-blue-400",
  processing: "bg-blue-500/10 text-blue-400",
  completed: "bg-emerald-500/10 text-emerald-400",
  failed: "bg-red-500/10 text-red-400",
};

export default function ReviewsPage() {
  const [loading, setLoading] = useState(false);
  const [productTitle, setProductTitle] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [source, setSource] = useState<ReviewSource>("aliexpress");
  const [maxReviewsInput, setMaxReviewsInput] = useState("10");
  const [filterSource, setFilterSource] = useState<ReviewSource | "all">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const { success, error: showError } = useToast();
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  // Clamped 1–50; empty/garbage input falls back to the default of 10.
  const parsedMax = parseInt(maxReviewsInput, 10);
  const maxReviews = Number.isNaN(parsedMax) ? 10 : parsedMax < 1 ? 1 : Math.min(50, parsedMax);

  const { data: statsData, mutate: mutateStats } = useAPI<{ stats: ReviewStats }>("/api/reviews?type=stats");
  const {
    data: reviewsData,
    mutate: mutateReviews,
    isLoading: reviewsLoading,
    error: reviewsError,
  } = useAPI<{ reviews: ProductReview[] }>(
    `/api/reviews?type=list${filterSource !== "all" ? `&source=${filterSource}` : ""}`
  );
  const { data: jobsData, mutate: mutateJobs, error: jobsError } = useAPI<{ jobs: ReviewImportJobDoc[] }>("/api/reviews?type=jobs");

  const stats = statsData?.stats;
  const reviews = reviewsData?.reviews || [];
  const jobs = jobsData?.jobs || [];

  const handleImport = useCallback(async () => {
    if (!productTitle.trim()) return;
    setLoading(true);
    try {
      const data = await authJson<{ imported: number }>("/api/reviews", {
        action: "import",
        productTitle: productTitle.trim(),
        productUrl: productUrl.trim(),
        source,
        maxReviews,
      });
      success(`Imported ${data.imported} review${data.imported === 1 ? "" : "s"} from ${SOURCES.find(s => s.id === source)?.label}`);
      mutateStats();
      mutateReviews();
      mutateJobs();
      setProductTitle("");
      setProductUrl("");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }, [productTitle, productUrl, source, maxReviews, success, showError, mutateStats, mutateReviews, mutateJobs]);

  const handleCopy = useCallback(
    async (text: string, id: string) => {
      const ok = await copyToClipboard(text);
      if (!ok) {
        showError("Couldn't copy to clipboard");
        return;
      }
      setCopied(id);
      success("Copied to clipboard");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 2000);
    },
    [success, showError]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const headers = await getAuthHeaders();
        await safeFetch(`/api/reviews?id=${encodeURIComponent(id)}`, { method: "DELETE", headers });
        success("Review deleted");
        mutateStats();
        mutateReviews();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setDeletingId(null);
      }
    },
    [success, showError, mutateStats, mutateReviews]
  );

  const handleReply = useCallback(
    async (review: ProductReview) => {
      setReplyingId(review.id);
      try {
        const data = await authJson<{ response: string }>("/api/reviews", {
          action: "respond",
          reviewId: review.id,
          review,
        });
        setReplies((prev) => ({ ...prev, [review.id]: data.response }));
        success("Reply generated");
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to generate reply");
      } finally {
        setReplyingId(null);
      }
    },
    [success, showError]
  );

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
            { label: "Total Reviews", value: stats.totalReviews, icon: Star, suffix: undefined },
            { label: "Avg Rating", value: stats.averageRating, icon: Star, suffix: "★" },
            { label: "With Images", value: stats.withImages, icon: Image, suffix: undefined },
            { label: "This Week", value: stats.recentImports, icon: Clock, suffix: undefined },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground uppercase">{s.label}</span>
                <s.icon className="h-3 w-3 text-accent" />
              </div>
              <div className="font-display text-lg font-bold text-foreground">
                {s.value}{s.suffix || ""}
              </div>
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
            <label htmlFor="rv-title" className="block text-xs font-medium text-muted-foreground mb-1.5">Product Name *</label>
            <input id="rv-title" type="text" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} maxLength={200}
              placeholder="e.g. Wireless Bluetooth Earbuds"
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
          <div>
            <label htmlFor="rv-url" className="block text-xs font-medium text-muted-foreground mb-1.5">Product URL</label>
            <input id="rv-url" type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} maxLength={500}
              placeholder="https://aliexpress.com/item/..."
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Source</label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => (
                <button key={s.id} onClick={() => setSource(s.id)} aria-pressed={source === s.id}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    source === s.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  <span aria-hidden="true">{s.icon}</span>
                  {s.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="rv-max" className="block text-xs font-medium text-muted-foreground mb-1.5">Max Reviews (1–50)</label>
            <input id="rv-max" type="number" value={maxReviewsInput}
              onChange={(e) => setMaxReviewsInput(e.target.value)}
              onBlur={() => setMaxReviewsInput(String(maxReviews))}
              min={1} max={50} step={1}
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
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterSource("all")} aria-pressed={filterSource === "all"}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterSource === "all" ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
          All
        </button>
        {SOURCES.map((s) => (
          <button key={s.id} onClick={() => setFilterSource(s.id)} aria-pressed={filterSource === s.id}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterSource === s.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
            <span aria-hidden="true">{s.icon}</span> {s.label.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <DataState isLoading={reviewsLoading} error={reviewsError} label="your reviews" onRetry={() => mutateReviews()} />

      {!reviewsLoading && !reviewsError && (
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
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <StarRating rating={review.rating} />
                      <span className="text-xs text-muted-foreground">by {review.author}</span>
                      {review.verified && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">
                        <span aria-hidden="true">{SOURCES.find(s => s.id === review.source)?.icon}</span> {review.source}
                      </span>
                    </div>
                    {review.title && <h4 className="text-sm font-semibold text-foreground mb-0.5">{review.title}</h4>}
                    <p className="text-sm text-foreground/80 line-clamp-2">{review.content}</p>
                    {review.images.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5">
                        {review.images.slice(0, 4).map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element -- external supplier images, next/image needs per-domain config
                          <img key={i} src={src} alt="" loading="lazy" className="h-10 w-10 rounded-lg object-cover border border-border" />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center flex-wrap gap-3 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">{review.helpful} found helpful</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        review.syncStatus === "synced" ? "bg-emerald-500/10 text-emerald-400" :
                        review.syncStatus === "pending" ? "bg-amber-500/10 text-amber-400" :
                        review.syncStatus === "failed" ? "bg-red-500/10 text-red-400" :
                        "bg-surface text-muted-foreground"
                      }`}>{review.syncStatus}</span>
                      <button onClick={() => handleReply(review)} disabled={replyingId === review.id}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-accent transition-all flex items-center gap-1 disabled:opacity-50">
                        {replyingId === review.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <MessageSquare className="h-2.5 w-2.5" />}
                        AI Reply
                      </button>
                    </div>
                    {replies[review.id] && (
                      <div className="mt-2 p-3 rounded-xl bg-accent/5 border border-accent/10">
                        <p className="text-[10px] text-muted-foreground mb-1">Suggested reply</p>
                        <p className="text-xs text-foreground leading-relaxed">{replies[review.id]}</p>
                        <button onClick={() => handleCopy(replies[review.id], `reply-${review.id}`)}
                          className="mt-2 text-[10px] px-2 py-0.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground transition-all flex items-center gap-1">
                          {copied === `reply-${review.id}` ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                          {copied === `reply-${review.id}` ? "Copied!" : "Copy reply"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button onClick={() => handleCopy(review.content, review.id)}
                      aria-label="Copy review" title="Copy review"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all">
                      {copied === review.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => handleDelete(review.id)} disabled={deletingId === review.id}
                      aria-label="Delete review" title="Delete review"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50">
                      {deletingId === review.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Import History */}
      {!jobsError && jobs.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-accent" />
            Import History
          </h3>
          <div className="space-y-2">
            {jobs.slice(0, 8).map((job) => (
              <div key={job.id} className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border/50 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{job.productTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {SOURCES.find(s => s.id === job.source)?.label || job.source} • {job.startedAt ? new Date(job.startedAt).toLocaleString() : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${JOB_STATUS_BADGES[job.status] || JOB_STATUS_BADGES.pending}`}>
                    {job.status}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{job.imported}/{job.totalFound} imported</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

