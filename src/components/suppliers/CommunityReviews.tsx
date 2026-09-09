"use client";

import { useState } from "react";
import { Star, ThumbsUp, Plus, Loader2, Shield } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI, useMutation, revalidate } from "@/hooks/useAPI";
import type { SupplierReview, SupplierCommunityScore } from "@/types/supplier";

function StarRating({ rating, onChange }: { rating: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange?.(star)}
          className={`transition-colors ${onChange ? "cursor-pointer" : "cursor-default"}`}
        >
          <Star className={`h-3.5 w-3.5 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-white/10"}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: SupplierReview & { id: string } }) {
  return (
    <div className="glass rounded-xl p-3 border border-border">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">{review.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRating rating={review.overallRating} />
            <span className="text-[10px] text-muted-foreground">by {review.userName}</span>
            {review.verified && (
              <span className="inline-flex items-center gap-0.5 text-[8px] text-emerald-400">
                <Shield className="h-2.5 w-2.5" /> Verified
              </span>
            )}
          </div>
        </div>
        <span className="text-[9px] text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
      </div>

      <p className="text-[11px] text-foreground mb-2">{review.body}</p>

      <div className="grid grid-cols-5 gap-1 mb-2">
        {Object.entries(review.breakdown).map(([key, value]) => (
          <div key={key} className="text-center">
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
            </div>
            <p className="text-[7px] text-muted-foreground mt-0.5 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          {review.orderVolume > 0 && <span>{review.orderVolume} orders</span>}
          {review.timeWorkingWithSupplier && <span>{review.timeWorkingWithSupplier}</span>}
        </div>
        <button className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors">
          <ThumbsUp className="h-2.5 w-2.5" /> {review.helpful}
        </button>
      </div>
    </div>
  );
}

function WriteReviewForm({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const [form, setForm] = useState({
    title: "",
    body: "",
    overallRating: 0,
    breakdown: { productQuality: 0, shippingSpeed: 0, communication: 0, pricing: 0, reliability: 0 },
  });

  const { trigger, isMutating } = useMutation("/api/suppliers/reviews", {
    onSuccess: () => { revalidate("/api/suppliers/reviews"); onClose(); },
  });

  const handleSubmit = async () => {
    if (!form.title || !form.body || form.overallRating === 0) return;
    await trigger({ body: { supplierId, ...form } });
  };

  const breakdownKeys = [
    { key: "productQuality" as const, label: "Product Quality" },
    { key: "shippingSpeed" as const, label: "Shipping Speed" },
    { key: "communication" as const, label: "Communication" },
    { key: "pricing" as const, label: "Pricing" },
    { key: "reliability" as const, label: "Reliability" },
  ];

  return (
    <div className="glass rounded-xl p-4 border border-accent/20 space-y-3">
      <p className="text-xs font-semibold text-foreground">Write a Review</p>
      <div>
        <p className="text-[10px] text-muted-foreground mb-1">Overall Rating</p>
        <StarRating rating={form.overallRating} onChange={(v) => setForm({ ...form, overallRating: v })} />
      </div>
      <input
        placeholder="Review title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full text-xs bg-white/5 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
      />
      <textarea
        placeholder="Your review..."
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
        className="w-full text-xs bg-white/5 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground min-h-[80px] resize-none"
      />
      <div className="space-y-2">
        {breakdownKeys.map(({ key, label }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <span className="text-[10px] text-accent">{form.breakdown[key]}/5</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              value={form.breakdown[key]}
              onChange={(e) => setForm({ ...form, breakdown: { ...form.breakdown, [key]: parseInt(e.target.value) } })}
              className="w-full h-1 rounded-full appearance-none bg-white/10 accent-accent"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 text-xs py-2 rounded-lg border border-border text-muted-foreground">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={isMutating || !form.title || !form.body || form.overallRating === 0}
          className="flex-1 text-xs py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          {isMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : "Submit"}
        </button>
      </div>
    </div>
  );
}

function CommunityScoreCard({ score }: { score: SupplierCommunityScore }) {
  return (
    <div className="glass rounded-xl p-3 border border-accent/20">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-foreground">Community Score</p>
        <div className="flex items-center gap-1">
          <StarRating rating={Math.round(score.avgRating)} />
          <span className="text-xs font-bold text-foreground">{score.avgRating}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-1.5 rounded-lg bg-white/5">
          <p className="text-[8px] text-muted-foreground">Reviews</p>
          <p className="text-xs font-medium text-foreground">{score.totalReviews}</p>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-white/5">
          <p className="text-[8px] text-muted-foreground">Verified</p>
          <p className="text-xs font-medium text-foreground">{score.verifiedPercentage}%</p>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-white/5">
          <p className="text-[8px] text-muted-foreground">Positive</p>
          <p className="text-xs font-medium text-foreground">{score.sentimentDistribution.positive}</p>
        </div>
      </div>
    </div>
  );
}

export default function CommunityReviews({ supplierId }: { supplierId: string }) {
  const { ref, isInView } = useInView();
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "helpful">("recent");

  const { data, isLoading } = useAPI<{ reviews: (SupplierReview & { id: string })[]; communityScore: SupplierCommunityScore }>(
    isInView && supplierId ? `/api/suppliers/reviews?supplierId=${supplierId}` : null
  );

  const reviews = data?.reviews || [];
  const communityScore = data?.communityScore;

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === "helpful") return b.helpful - a.helpful;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div ref={ref} className="glass rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Community Reviews</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "helpful")}
            className="text-[10px] bg-white/5 border border-border rounded-lg px-2 py-1 text-foreground"
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/15 text-accent text-[10px] font-medium"
          >
            <Plus className="h-3 w-3" /> Review
          </button>
        </div>
      </div>

      {showForm && <WriteReviewForm supplierId={supplierId} onClose={() => setShowForm(false)} />}

      {communityScore && <div className="mt-3"><CommunityScoreCard score={communityScore} /></div>}

      {isLoading ? (
        <div className="space-y-3 mt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : sortedReviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No reviews yet. Be the first to review this supplier.</p>
        </div>
      ) : (
        <div className="space-y-3 mt-3">
          {sortedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
