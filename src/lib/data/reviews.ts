import { getAdminDB } from "@/lib/firebase-admin";
import { handleFirestoreError } from "./utils";
import type { ProductReviewDoc, ReviewImportJobDoc, ReviewStats, ReviewSource, ReviewFilter } from "@/types/reviews";

const REVIEWS_COLLECTION = "productReviews";
const JOBS_COLLECTION = "reviewImportJobs";

export async function addReviews(uid: string, reviews: Omit<ProductReviewDoc, "id" | "createdAt">[]): Promise<string[]> {
  try {
    const db = await getAdminDB();
    const ids: string[] = [];
    for (const review of reviews) {
      const ref = db.collection("users").doc(uid).collection(REVIEWS_COLLECTION).doc();
      await ref.set({ ...review, createdAt: new Date().toISOString() });
      ids.push(ref.id);
    }
    return ids;
  } catch (error) {
    handleFirestoreError("addReviews", error);
    return [];
  }
}

export async function getReviews(uid: string, filter: ReviewFilter = {}): Promise<ProductReviewDoc[]> {
  try {
    const db = await getAdminDB();
    const limit = Math.min(filter.limit || 50, 200);
    let query = db.collection("users").doc(uid).collection(REVIEWS_COLLECTION)
      .orderBy("createdAt", "desc").limit(limit);

    if (filter.source) query = query.where("source", "==", filter.source);
    if (filter.rating) query = query.where("rating", "==", filter.rating);
    if (filter.syncStatus) query = query.where("syncStatus", "==", filter.syncStatus);
    if (filter.verified !== undefined) query = query.where("verified", "==", filter.verified);

    const snap = await query.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProductReviewDoc[];
  } catch (error) {
    handleFirestoreError("getReviews", error);
    return [];
  }
}

export async function deleteReview(uid: string, reviewId: string): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(REVIEWS_COLLECTION).doc(reviewId).delete();
    return true;
  } catch (error) {
    handleFirestoreError("deleteReview", error);
    return false;
  }
}

export async function addImportJob(uid: string, job: Omit<ReviewImportJobDoc, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection(JOBS_COLLECTION).doc();
    await ref.set({ ...job, createdAt: new Date().toISOString() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addImportJob", error);
    return undefined;
  }
}

export async function getImportJobs(uid: string, limit = 20): Promise<ReviewImportJobDoc[]> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection(JOBS_COLLECTION)
      .orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ReviewImportJobDoc[];
  } catch (error) {
    handleFirestoreError("getImportJobs", error);
    return [];
  }
}

export async function getReviewStats(uid: string): Promise<ReviewStats> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection(REVIEWS_COLLECTION)
      .orderBy("createdAt", "desc").limit(500).get();
    const docs = snap.docs.map((d) => d.data()) as ProductReviewDoc[];

    const total = docs.length;
    const avgRating = total > 0 ? docs.reduce((s, d) => s + d.rating, 0) / total : 0;

    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const sourceBreakdown: Record<ReviewSource, number> = { aliexpress: 0, cj: 0, amazon: 0, ebay: 0, manual: 0, csv: 0 };

    docs.forEach((d) => {
      ratingDist[d.rating] = (ratingDist[d.rating] || 0) + 1;
      sourceBreakdown[d.source] = (sourceBreakdown[d.source] || 0) + 1;
    });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString();

    return {
      totalReviews: total,
      averageRating: Math.round(avgRating * 10) / 10,
      ratingDistribution: ratingDist,
      sourceBreakdown,
      syncStats: {
        synced: docs.filter((d) => d.syncStatus === "synced").length,
        pending: docs.filter((d) => d.syncStatus === "pending").length,
        failed: docs.filter((d) => d.syncStatus === "failed").length,
      },
      withImages: docs.filter((d) => d.images.length > 0).length,
      verifiedCount: docs.filter((d) => d.verified).length,
      recentImports: docs.filter((d) => {
        const created = typeof d.createdAt === "string" ? d.createdAt : (d.createdAt?.toDate?.() || new Date(d.createdAt as any)).toISOString();
        return created >= weekAgoStr;
      }).length,
    };
  } catch (error) {
    handleFirestoreError("getReviewStats", error);
    return {
      totalReviews: 0, averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      sourceBreakdown: { aliexpress: 0, cj: 0, amazon: 0, ebay: 0, manual: 0, csv: 0 },
      syncStats: { synced: 0, pending: 0, failed: 0 },
      withImages: 0, verifiedCount: 0, recentImports: 0,
    };
  }
}
