import { getAdminDB } from "@/lib/firebase-admin";
import { handleFirestoreError } from "./utils";
import { calculateRefundStats } from "@/lib/refund-cascade";
import type { RefundCascade, RefundStats } from "@/types/refund-cascade";

const COLLECTION = "refundCascades";

export async function addRefundCascade(uid: string, cascade: RefundCascade): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection(COLLECTION).doc();
    await ref.set({ ...cascade, id: ref.id });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addRefundCascade", error);
    return undefined;
  }
}

export async function getRefundCascades(uid: string, maxResults = 50): Promise<RefundCascade[]> {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users").doc(uid).collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(maxResults)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as RefundCascade[];
  } catch (error) {
    handleFirestoreError("getRefundCascades", error);
    return [];
  }
}

export async function getRefundCascadeById(uid: string, cascadeId: string): Promise<RefundCascade | null> {
  try {
    const db = await getAdminDB();
    const doc = await db.collection("users").doc(uid).collection(COLLECTION).doc(cascadeId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as RefundCascade;
  } catch (error) {
    handleFirestoreError("getRefundCascadeById", error);
    return null;
  }
}

export async function updateRefundCascade(
  uid: string,
  cascadeId: string,
  cascade: RefundCascade
): Promise<boolean> {
  try {
    const db = await getAdminDB();
    // Full-object replace keeps steps/timeline in sync; updatedAt comes from the caller.
    await db.collection("users").doc(uid).collection(COLLECTION).doc(cascadeId).set(cascade);
    return true;
  } catch (error) {
    handleFirestoreError("updateRefundCascade", error);
    return false;
  }
}

export async function deleteRefundCascade(uid: string, cascadeId: string): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(COLLECTION).doc(cascadeId).delete();
    return true;
  } catch (error) {
    handleFirestoreError("deleteRefundCascade", error);
    return false;
  }
}

export async function getRefundCascadeStats(uid: string): Promise<RefundStats> {
  try {
    const cascades = await getRefundCascades(uid, 200);
    const stats = calculateRefundStats(cascades);
    // Monthly trend (last 6 months) derived from cascade timestamps.
    const monthlyMap: Record<string, { count: number; amount: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = { count: 0, amount: 0 };
    }
    cascades.forEach((c) => {
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].count++;
        monthlyMap[key].amount += c.refundAmount || 0;
      }
    });
    const refundRate = cascades.length > 0
      ? (cascades.filter((c) => c.status === "completed").length / cascades.length) * 100
      : 0;
    return {
      ...stats,
      refundRate: Math.round(refundRate * 10) / 10,
      monthlyTrend: Object.entries(monthlyMap).map(([month, v]) => ({ month, count: v.count, amount: Math.round(v.amount * 100) / 100 })),
    };
  } catch (error) {
    handleFirestoreError("getRefundCascadeStats", error);
    return {
      totalRefunds: 0, totalRefundAmount: 0, supplierRecovery: 0, netLoss: 0,
      avgProcessingDays: 0, refundRate: 0, topReasons: [], monthlyTrend: [],
    };
  }
}
