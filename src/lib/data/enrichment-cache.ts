import { doc, setDoc, getDoc, deleteDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { EnrichmentCacheEntrySchema, CacheEnrichmentInputSchema } from "./schemas";

export interface EnrichmentCacheEntry {
  id: string;
  productKey: string;
  data: Record<string, unknown>;
  createdAt: Timestamp;
}

export async function cacheEnrichment(uid: string, productKey: string, data: Record<string, unknown>) {
  try {
    const input = CacheEnrichmentInputSchema.parse({ productKey, data });
    await setDoc(doc(db, "users", uid, "enrichmentCache", input.productKey), {
      productKey: input.productKey,
      data: input.data,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError("cacheEnrichment", error);
  }
}

export async function getEnrichmentCache(uid: string, productKey: string): Promise<EnrichmentCacheEntry | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "enrichmentCache", productKey));
    return snap.exists() ? { id: snap.id, ...EnrichmentCacheEntrySchema.parse(snap.data()) } : null;
  } catch (error) {
    handleFirestoreError("getEnrichmentCache", error);
  }
}
