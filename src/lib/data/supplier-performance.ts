import { doc, setDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { SupplierPerformanceDocSchema, SupplierAlertDocSchema, AddSupplierPerformanceInputSchema, AddSupplierAlertInputSchema } from "./schemas";

export interface SupplierPerformanceDoc {
  id: string;
  supplierId: string;
  supplierName: string;
  reliabilityScore: number;
  refundRate: number;
  avgShippingDays: number;
  complaintRate: number;
  stockReliability: number;
  snapshotDate: string;
  createdAt: Timestamp;
}

export async function addSupplierPerformance(uid: string, entry: Omit<SupplierPerformanceDoc, "id" | "createdAt">) {
  try {
    const input = AddSupplierPerformanceInputSchema.parse(entry);
    const ref = doc(collection(db, "users", uid, "supplierPerformance"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addSupplierPerformance", error);
  }
}

export async function getSupplierPerformanceHistory(uid: string, supplierId: string): Promise<SupplierPerformanceDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "supplierPerformance"),
      where("supplierId", "==", supplierId),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...SupplierPerformanceDocSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getSupplierPerformanceHistory", error);
  }
}

export interface SupplierAlertDoc {
  id: string;
  supplierId: string;
  supplierName: string;
  type: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  read: boolean;
  createdAt: Timestamp;
}

export async function addSupplierAlert(uid: string, alert: Omit<SupplierAlertDoc, "id" | "createdAt">) {
  try {
    const input = AddSupplierAlertInputSchema.parse(alert);
    const ref = doc(collection(db, "users", uid, "supplierAlerts"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addSupplierAlert", error);
  }
}

export async function getSupplierAlerts(uid: string): Promise<SupplierAlertDoc[]> {
  try {
    const q = query(collection(db, "users", uid, "supplierAlerts"), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...SupplierAlertDocSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getSupplierAlerts", error);
  }
}
