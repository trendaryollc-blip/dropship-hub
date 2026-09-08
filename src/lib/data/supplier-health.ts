import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import type { SupplierHealthSnapshot, SupplierHealthAlert } from "@/types/supplier";

export type SupplierHealthSnapshotDoc = SupplierHealthSnapshot & { createdAt: Timestamp };
export type SupplierHealthAlertDoc = SupplierHealthAlert & { createdAt: Timestamp };

export async function getHealthSnapshot(uid: string, supplierId: string): Promise<SupplierHealthSnapshotDoc | null> {
  try {
    const ref = doc(db, "users", uid, "supplierHealth", supplierId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return { ...data as SupplierHealthSnapshot, createdAt: data.createdAt } as SupplierHealthSnapshotDoc;
  } catch (error) {
    handleFirestoreError("getHealthSnapshot", error);
    return null;
  }
}

export async function saveHealthSnapshot(uid: string, supplierId: string, data: SupplierHealthSnapshot) {
  try {
    const ref = doc(db, "users", uid, "supplierHealth", supplierId);
    await setDoc(ref, { ...data, createdAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError("saveHealthSnapshot", error);
  }
}

export async function getHealthAlerts(uid: string): Promise<SupplierHealthAlertDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "supplierHealthAlerts"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, ...data } as SupplierHealthAlertDoc;
    });
  } catch (error) {
    handleFirestoreError("getHealthAlerts", error);
    return [];
  }
}

export async function saveHealthAlert(uid: string, alert: Omit<SupplierHealthAlert, "id">) {
  try {
    const ref = doc(collection(db, "users", uid, "supplierHealthAlerts"));
    await setDoc(ref, { ...alert, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("saveHealthAlert", error);
  }
}
