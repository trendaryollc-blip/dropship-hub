import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { SupplierDueDiligenceDocSchema } from "./schemas";
import type { SupplierDueDiligence } from "@/types/supplier";

export type SupplierDueDiligenceDoc = SupplierDueDiligence & { createdAt: Timestamp };

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getDueDiligence(uid: string, supplierId: string): Promise<SupplierDueDiligenceDoc | null> {
  try {
    const ref = doc(db, "users", uid, "supplierDueDiligence", supplierId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    const parsed = SupplierDueDiligenceDocSchema.parse(data);
    return { ...parsed, createdAt: data.createdAt } as SupplierDueDiligenceDoc;
  } catch (error) {
    handleFirestoreError("getDueDiligence", error);
    return null;
  }
}

export async function saveDueDiligence(uid: string, supplierId: string, data: Omit<SupplierDueDiligence, "createdAt">) {
  try {
    const ref = doc(db, "users", uid, "supplierDueDiligence", supplierId);
    await setDoc(ref, { ...data, createdAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError("saveDueDiligence", error);
  }
}

export async function isDueDiligenceFresh(uid: string, supplierId: string): Promise<boolean> {
  const existing = await getDueDiligence(uid, supplierId);
  if (!existing) return false;
  const generatedAt = new Date(existing.generatedAt).getTime();
  return Date.now() - generatedAt < CACHE_TTL_MS;
}

export async function getRecentDueDiligence(uid: string, count: number = 10): Promise<SupplierDueDiligenceDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "supplierDueDiligence"),
      orderBy("createdAt", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      const parsed = SupplierDueDiligenceDocSchema.parse(data);
      return { ...parsed, createdAt: data.createdAt } as SupplierDueDiligenceDoc;
    });
  } catch (error) {
    handleFirestoreError("getRecentDueDiligence", error);
    return [];
  }
}
