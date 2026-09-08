import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import type { SampleOrder, SupplierQualityScore } from "@/types/supplier";

export type SampleOrderDoc = SampleOrder & { createdAt: Timestamp };

export async function getSampleOrders(uid: string): Promise<SampleOrderDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "sampleOrders"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data } as SampleOrderDoc;
    });
  } catch (error) {
    handleFirestoreError("getSampleOrders", error);
    return [];
  }
}

export async function createSampleOrder(uid: string, order: Omit<SampleOrder, "id">) {
  try {
    const ref = doc(collection(db, "users", uid, "sampleOrders"));
    await setDoc(ref, { ...order, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("createSampleOrder", error);
    return null;
  }
}

export async function updateSampleOrder(uid: string, orderId: string, updates: Partial<SampleOrder>) {
  try {
    const ref = doc(db, "users", uid, "sampleOrders", orderId);
    await setDoc(ref, updates, { merge: true });
  } catch (error) {
    handleFirestoreError("updateSampleOrder", error);
  }
}

export async function getQualityScore(uid: string, supplierId: string): Promise<SupplierQualityScore | null> {
  try {
    const ref = doc(db, "users", uid, "supplierQualityScores", supplierId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as SupplierQualityScore;
  } catch (error) {
    handleFirestoreError("getQualityScore", error);
    return null;
  }
}
