import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { doc, collection, query, orderBy, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError } from "@/lib/data/utils";
import { safeErrorMessage } from "@/lib/api-errors";

export interface PendingAdjustment {
  id: string;
  ruleId: string;
  productTitle: string;
  previousPrice: number;
  suggestedPrice: number;
  reason: string;
  strategy: string;
  competitorPrice?: number;
  marginBefore: number;
  marginAfter: number;
  expiresAt: string;
  createdAt: string;
}

async function getPendingAdjustments(uid: string): Promise<PendingAdjustment[]> {
  try {
    const q = query(
      collection(db, "users", uid, "pricePendingAdjustments"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PendingAdjustment));
  } catch (error) {
    handleFirestoreError("getPendingAdjustments", error);
    return [];
  }
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const adjustments = await getPendingAdjustments(uid);
    return NextResponse.json({ adjustments });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch pending adjustments", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { adjustmentIds, action } = body as { adjustmentIds: string[]; action: "approve" | "reject" | "approve_all" | "reject_all" };

    if (action === "approve_all" || action === "reject_all") {
      const pending = await getPendingAdjustments(uid);
      if (pending.length === 0) {
        return NextResponse.json({ success: true, affected: 0 });
      }

      const batch = writeBatch(db);
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      for (const adj of pending) {
        const createdAt = new Date(adj.createdAt);
        if (createdAt < twentyFourHoursAgo) {
          batch.delete(doc(db, "users", uid, "pricePendingAdjustments", adj.id));
          continue;
        }

        if (action === "approve_all") {
          batch.delete(doc(db, "users", uid, "pricePendingAdjustments", adj.id));
        } else {
          batch.delete(doc(db, "users", uid, "pricePendingAdjustments", adj.id));
        }
      }

      await batch.commit();
      return NextResponse.json({ success: true, affected: pending.length });
    }

    if (!adjustmentIds || !Array.isArray(adjustmentIds) || adjustmentIds.length === 0) {
      return NextResponse.json({ error: "Missing adjustmentIds" }, { status: 400 });
    }

    const batch = writeBatch(db);
    let affected = 0;

    for (const id of adjustmentIds) {
      batch.delete(doc(db, "users", uid, "pricePendingAdjustments", id));
      affected++;
    }

    await batch.commit();
    return NextResponse.json({ success: true, affected });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process adjustments", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
