import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { PriceIntelligenceDocSchema } from "./schemas";
import type { PriceIntelligenceProduct } from "@/types/supplier";

export type PriceIntelligenceDoc = PriceIntelligenceProduct & { createdAt: Timestamp };

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function getPriceIntelligence(uid: string, productId: string): Promise<PriceIntelligenceDoc | null> {
  try {
    const ref = doc(db, "users", uid, "supplierPriceCache", productId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    const parsed = PriceIntelligenceDocSchema.parse(data);
    return { ...parsed, createdAt: data.createdAt } as PriceIntelligenceDoc;
  } catch (error) {
    handleFirestoreError("getPriceIntelligence", error);
    return null;
  }
}

export async function savePriceIntelligence(uid: string, productId: string, data: Omit<PriceIntelligenceProduct, "createdAt">) {
  try {
    const ref = doc(db, "users", uid, "supplierPriceCache", productId);
    await setDoc(ref, { ...data, createdAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError("savePriceIntelligence", error);
  }
}

export async function isPriceIntelligenceFresh(uid: string, productId: string): Promise<boolean> {
  const existing = await getPriceIntelligence(uid, productId);
  if (!existing) return false;
  const lastUpdated = new Date(existing.lastUpdated).getTime();
  return Date.now() - lastUpdated < CACHE_TTL_MS;
}

export async function getRecentPriceLookups(uid: string, count: number = 10): Promise<PriceIntelligenceDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "supplierPriceCache"),
      orderBy("createdAt", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      const parsed = PriceIntelligenceDocSchema.parse(data);
      return { ...parsed, createdAt: data.createdAt } as PriceIntelligenceDoc;
    });
  } catch (error) {
    handleFirestoreError("getRecentPriceLookups", error);
    return [];
  }
}
