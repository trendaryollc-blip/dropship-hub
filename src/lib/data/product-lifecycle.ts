import { doc, setDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { ProductLifecycleDocSchema, LifecycleSnapshotDocSchema, LifecycleAlertDocSchema, AddProductLifecycleInputSchema, AddLifecycleSnapshotInputSchema, AddLifecycleAlertInputSchema } from "./schemas";

export interface ProductLifecycleDoc {
  id: string;
  productId: string;
  productTitle: string;
  currentStage: string;
  stageEnteredAt: string;
  totalDaysTracked: number;
  createdAt: Timestamp;
}

export async function addProductLifecycle(uid: string, entry: Omit<ProductLifecycleDoc, "id" | "createdAt">) {
  try {
    const input = AddProductLifecycleInputSchema.parse(entry);
    const ref = doc(collection(db, "users", uid, "productLifecycle"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addProductLifecycle", error);
  }
}

export async function getProductLifecycles(uid: string): Promise<ProductLifecycleDoc[]> {
  try {
    const q = query(collection(db, "users", uid, "productLifecycle"), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...ProductLifecycleDocSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getProductLifecycles", error);
  }
}

export interface LifecycleSnapshotDoc {
  id: string;
  productId: string;
  date: string;
  stage: string;
  orders: number;
  revenue: number;
  profit: number;
  competitionCount: number;
  searchVolume: number;
  createdAt: Timestamp;
}

export async function addLifecycleSnapshot(uid: string, snapshot: Omit<LifecycleSnapshotDoc, "id" | "createdAt">) {
  try {
    const input = AddLifecycleSnapshotInputSchema.parse(snapshot);
    const ref = doc(collection(db, "users", uid, "lifecycleSnapshots"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addLifecycleSnapshot", error);
  }
}

export async function getLifecycleSnapshots(uid: string, productId: string): Promise<LifecycleSnapshotDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "lifecycleSnapshots"),
      where("productId", "==", productId),
      orderBy("createdAt", "desc"),
      limit(90)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...LifecycleSnapshotDocSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getLifecycleSnapshots", error);
  }
}

export interface LifecycleAlertDoc {
  id: string;
  productId: string;
  productTitle: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  read: boolean;
  createdAt: Timestamp;
}

export async function addLifecycleAlert(uid: string, alert: Omit<LifecycleAlertDoc, "id" | "createdAt">) {
  try {
    const input = AddLifecycleAlertInputSchema.parse(alert);
    const ref = doc(collection(db, "users", uid, "lifecycleAlerts"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addLifecycleAlert", error);
  }
}

export async function getLifecycleAlerts(uid: string): Promise<LifecycleAlertDoc[]> {
  try {
    const q = query(collection(db, "users", uid, "lifecycleAlerts"), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...LifecycleAlertDocSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getLifecycleAlerts", error);
  }
}
