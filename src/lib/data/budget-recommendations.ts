import { doc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, where, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { BudgetRecommendationSchema, AddBudgetRecommendationInputSchema } from "./schemas";

export interface BudgetRecommendation {
  id: string;
  type: "scale_up" | "scale_down" | "pause" | "reallocate" | "new_test";
  campaignId: string;
  campaignName: string;
  currentBudget: number;
  recommendedBudget: number;
  reason: string;
  expectedImpact: {
    roasChange: number;
    revenueChange: number;
    confidence: number;
  };
  status: "pending" | "accepted" | "rejected" | "expired";
  expiresAt: string;
  createdAt: Timestamp;
}

export async function addBudgetRecommendation(uid: string, rec: Omit<BudgetRecommendation, "id" | "createdAt">) {
  try {
    const input = AddBudgetRecommendationInputSchema.parse(rec);
    const ref = doc(collection(db, "users", uid, "budgetRecommendations"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addBudgetRecommendation", error);
  }
}

export async function getBudgetRecommendations(uid: string, limitCount = 50): Promise<BudgetRecommendation[]> {
  try {
    const q = query(collection(db, "users", uid, "budgetRecommendations"), orderBy("createdAt", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...BudgetRecommendationSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getBudgetRecommendations", error);
  }
}

export async function getBudgetRecommendationsByStatus(uid: string, status: BudgetRecommendation["status"]): Promise<BudgetRecommendation[]> {
  try {
    const q = query(collection(db, "users", uid, "budgetRecommendations"), where("status", "==", status), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...BudgetRecommendationSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getBudgetRecommendationsByStatus", error);
  }
}

export async function updateBudgetRecommendation(uid: string, recId: string, updates: Partial<Pick<BudgetRecommendation, "status">>) {
  try {
    await updateDoc(doc(db, "users", uid, "budgetRecommendations", recId), updates);
  } catch (error) {
    handleFirestoreError("updateBudgetRecommendation", error);
  }
}
