import { doc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import type { NicheSupplierScore } from "@/types/supplier";

export type NicheSupplierScoreDoc = NicheSupplierScore & { createdAt: Timestamp };

export async function getNicheScores(uid: string): Promise<NicheSupplierScoreDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "supplierNicheScores"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data } as unknown as NicheSupplierScoreDoc;
    });
  } catch (error) {
    handleFirestoreError("getNicheScores", error);
    return [];
  }
}

export async function saveNicheScores(uid: string, supplierId: string, scores: Omit<NicheSupplierScore, "supplierId">) {
  try {
    const ref = doc(db, "users", uid, "supplierNicheScores", supplierId);
    await setDoc(ref, { ...scores, supplierId, createdAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError("saveNicheScores", error);
  }
}
