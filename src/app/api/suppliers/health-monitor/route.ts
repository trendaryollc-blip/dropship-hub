import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

function calculateOverallHealth(metrics: {
  shippingSpeed: number;
  stockLevel: number;
  priceStability: number;
  responseTime: number;
  refundRate: number;
}): number {
  return Math.round(
    metrics.shippingSpeed * 0.25 +
    metrics.stockLevel * 0.2 +
    metrics.priceStability * 0.2 +
    metrics.responseTime * 0.2 +
    (100 - metrics.refundRate) * 0.15
  );
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    const view = searchParams.get("view") || "dashboard";

    if (view === "alerts") {
      const alertsSnap = await db
        .collection("users")
        .doc(uid)
        .collection("supplierHealthAlerts")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const alerts = alertsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ alerts });
    }

    if (supplierId) {
      const snap = await db
        .collection("users")
        .doc(uid)
        .collection("supplierHealth")
        .doc(supplierId)
        .get();

      if (!snap.exists) {
        return NextResponse.json({ snapshot: null, message: "No health data for this supplier" });
      }

      return NextResponse.json({ snapshot: { id: snap.id, ...snap.data() } });
    }

    const healthSnap = await db
      .collection("users")
      .doc(uid)
      .collection("supplierHealth")
      .get();

    const snapshots = healthSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const alertsSnap = await db
      .collection("users")
      .doc(uid)
      .collection("supplierHealthAlerts")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const alerts = alertsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ snapshots, alerts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
