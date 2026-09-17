import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { DocumentData } from "firebase-admin/firestore";

export const GET = withAuth(async (_request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    const snap = await userRef
      .collection("digests")
      .where("date", ">=", sevenDaysAgo)
      .orderBy("date", "asc")
      .get();

    const days = snap.docs.map((doc) => {
      const data = doc.data() as DocumentData;
      return {
        date: data.date,
        revenue: typeof data.metrics?.revenue === "number" ? data.metrics.revenue : 0,
        profit: typeof data.metrics?.profit === "number" ? data.metrics.profit : 0,
        orders: typeof data.metrics?.orders === "number" ? data.metrics.orders : 0,
      };
    });

    return NextResponse.json({ days });
  } catch {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
});
