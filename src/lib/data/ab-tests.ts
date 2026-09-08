import { doc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, where, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { ABTestSchema, AddABTestInputSchema } from "./schemas";

export interface ABTest {
  id: string;
  campaignId: string;
  name: string;
  status: "running" | "completed" | "paused";
  creativeAId: string;
  creativeBId: string;
  splitPercent: number;
  winnerId?: string;
  winnerConfidence?: number;
  startDate: string;
  endDate?: string;
  results?: {
    aMetrics: {
      impressions: number;
      clicks: number;
      conversions: number;
      ctr: number;
      conversionRate: number;
    };
    bMetrics: {
      impressions: number;
      clicks: number;
      conversions: number;
      ctr: number;
      conversionRate: number;
    };
    statisticallySignificant: boolean;
    pValue?: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function addABTest(uid: string, test: Omit<ABTest, "id" | "createdAt" | "updatedAt">) {
  try {
    const input = AddABTestInputSchema.parse(test);
    const ref = doc(collection(db, "users", uid, "abTests"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addABTest", error);
  }
}

export async function getABTests(uid: string, limitCount = 50): Promise<ABTest[]> {
  try {
    const q = query(collection(db, "users", uid, "abTests"), orderBy("createdAt", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...ABTestSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getABTests", error);
  }
}

export async function getABTestsByStatus(uid: string, status: ABTest["status"]): Promise<ABTest[]> {
  try {
    const q = query(collection(db, "users", uid, "abTests"), where("status", "==", status), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...ABTestSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getABTestsByStatus", error);
  }
}

export async function getABTestsByCampaign(uid: string, campaignId: string): Promise<ABTest[]> {
  try {
    const q = query(collection(db, "users", uid, "abTests"), where("campaignId", "==", campaignId), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...ABTestSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getABTestsByCampaign", error);
  }
}

export async function updateABTest(uid: string, testId: string, updates: Partial<Omit<ABTest, "id" | "createdAt">>) {
  try {
    await updateDoc(doc(db, "users", uid, "abTests", testId), { ...updates, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("updateABTest", error);
  }
}
