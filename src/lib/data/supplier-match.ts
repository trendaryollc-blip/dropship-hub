import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import type { SupplierMatchResult } from "@/types/supplier";

export type SupplierMatchResultDoc = SupplierMatchResult & { createdAt: Timestamp };

export async function getMatchResults(uid: string): Promise<SupplierMatchResultDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "supplierMatchResults"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data } as SupplierMatchResultDoc;
    });
  } catch (error) {
    handleFirestoreError("getMatchResults", error);
    return [];
  }
}

export async function saveMatchResult(uid: string, result: SupplierMatchResult) {
  try {
    const ref = doc(db, "users", uid, "supplierMatchResults", result.id);
    await setDoc(ref, { ...result, createdAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError("saveMatchResult", error);
  }
}
