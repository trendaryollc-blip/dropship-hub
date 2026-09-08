import { doc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp, where } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { ListingDocSchema, AddListingInputSchema } from "./schemas";

export interface ListingDoc {
  id: string;
  platform: string;
  title: string;
  description: string;
  bulletPoints: string[];
  seoTags: string[];
  backendKeywords?: string[];
  storyDescription?: string;
  characterCounts: { title: number; description: number };
  optimizationScore: number;
  productTitle: string;
  productImage?: string;
  productPrice: number;
  notes?: string;
  usedAt?: string;
  createdAt: Timestamp;
}

export async function addListing(uid: string, listing: Omit<ListingDoc, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const input = AddListingInputSchema.parse(listing);
    const ref = doc(collection(db, "users", uid, "productListings"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addListing", error);
    return undefined;
  }
}

export async function getListings(uid: string, platform?: string): Promise<ListingDoc[]> {
  try {
    let q;
    if (platform) {
      q = query(
        collection(db, "users", uid, "productListings"),
        where("platform", "==", platform),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    } else {
      q = query(collection(db, "users", uid, "productListings"), orderBy("createdAt", "desc"), limit(50));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...ListingDocSchema.parse(d.data()) } as unknown as ListingDoc));
  } catch (error) {
    handleFirestoreError("getListings", error);
    return [];
  }
}

export async function deleteListing(uid: string, listingId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "users", uid, "productListings", listingId));
    return true;
  } catch (error) {
    handleFirestoreError("deleteListing", error);
    return false;
  }
}

export async function updateListingUsage(uid: string, listingId: string): Promise<boolean> {
  try {
    const ref = doc(db, "users", uid, "productListings", listingId);
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(ref, { usedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    handleFirestoreError("updateListingUsage", error);
    return false;
  }
}

export async function getListingStats(uid: string): Promise<{
  totalGenerated: number;
  byPlatform: Record<string, number>;
  avgOptimizationScore: number;
  lastGenerated?: string;
}> {
  try {
    const listings = await getListings(uid);
    const byPlatform: Record<string, number> = {};
    let totalScore = 0;

    for (const listing of listings) {
      byPlatform[listing.platform] = (byPlatform[listing.platform] || 0) + 1;
      totalScore += listing.optimizationScore;
    }

    return {
      totalGenerated: listings.length,
      byPlatform,
      avgOptimizationScore: listings.length > 0 ? Math.round(totalScore / listings.length) : 0,
      lastGenerated: listings[0]?.createdAt?.toDate?.()?.toISOString?.(),
    };
  } catch (error) {
    handleFirestoreError("getListingStats", error);
    return { totalGenerated: 0, byPlatform: {}, avgOptimizationScore: 0 };
  }
}
