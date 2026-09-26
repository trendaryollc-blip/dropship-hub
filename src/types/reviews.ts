import { Timestamp } from "firebase/firestore";
import { z } from "zod";

// ── Review Types ─────────────────────────────────────────────────────────────

export type ReviewSource = "aliexpress" | "cj" | "amazon" | "ebay" | "manual" | "csv";
export type ReviewSyncStatus = "pending" | "syncing" | "synced" | "failed" | "skipped";

export interface ProductReview {
  id: string;
  productId: string;
  productTitle: string;
  source: ReviewSource;
  sourceReviewId?: string;
  author: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  images: string[];
  verified: boolean;
  helpful: number;
  purchaseDate?: string;
  syncStatus: ReviewSyncStatus;
  syncedTo?: string[]; // store IDs
  syncedAt?: string;
  createdAt: string;
}

export interface ReviewImportJob {
  id: string;
  productTitle: string;
  productUrl: string;
  source: ReviewSource;
  status: "pending" | "scraping" | "processing" | "completed" | "failed";
  totalFound: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  sourceBreakdown: Record<ReviewSource, number>;
  syncStats: {
    synced: number;
    pending: number;
    failed: number;
  };
  withImages: number;
  verifiedCount: number;
  recentImports: number;
}

export interface ReviewTemplate {
  id: string;
  name: string;
  rating: number;
  responseText: string;
  category: string;
  usageCount: number;
  createdAt: string;
}

export interface ReviewFilter {
  source?: ReviewSource;
  rating?: number;
  syncStatus?: ReviewSyncStatus;
  withImages?: boolean;
  verified?: boolean;
  search?: string;
  limit?: number;
}

// ── Firestore Doc ────────────────────────────────────────────────────────────

export interface ProductReviewDoc {
  id: string;
  productId: string;
  productTitle: string;
  source: ReviewSource;
  sourceReviewId?: string;
  author: string;
  rating: number;
  title?: string;
  content: string;
  images: string[];
  verified: boolean;
  helpful: number;
  syncStatus: ReviewSyncStatus;
  syncedTo?: string[];
  createdAt: Timestamp;
}

export interface ReviewImportJobDoc {
  id: string;
  productTitle: string;
  productUrl: string;
  source: ReviewSource;
  status: string;
  totalFound: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
  createdAt: Timestamp;
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

export const ImportReviewsInputSchema = z.object({
  action: z.literal("import"),
  productTitle: z.string().trim().min(1).max(200),
  productUrl: z.string().trim().max(500).default(""),
  source: z.enum(["aliexpress", "cj", "amazon", "ebay", "csv"]),
  maxReviews: z.coerce.number().int().min(1).max(50).default(10),
  csv: z.string().max(400_000).optional(),
});

export type ImportReviewsInput = z.infer<typeof ImportReviewsInputSchema>;
