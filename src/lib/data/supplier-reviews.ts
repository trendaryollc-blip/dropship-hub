import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import type { SupplierReview, SupplierCommunityScore } from "@/types/supplier";

export type SupplierReviewDoc = SupplierReview & { createdAt: Timestamp };

export async function getReviews(uid: string, supplierId: string): Promise<SupplierReviewDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "supplierReviews"),
      where("supplierId", "==", supplierId),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data } as SupplierReviewDoc;
    });
  } catch (error) {
    handleFirestoreError("getReviews", error);
    return [];
  }
}

export async function createReview(uid: string, review: Omit<SupplierReview, "id">) {
  try {
    const ref = doc(collection(db, "users", uid, "supplierReviews"));
    await setDoc(ref, { ...review, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("createReview", error);
    return null;
  }
}

export async function getCommunityScore(uid: string, supplierId: string): Promise<SupplierCommunityScore | null> {
  try {
    const ref = doc(db, "users", uid, "supplierCommunityScores", supplierId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as SupplierCommunityScore;
  } catch (error) {
    handleFirestoreError("getCommunityScore", error);
    return null;
  }
}
