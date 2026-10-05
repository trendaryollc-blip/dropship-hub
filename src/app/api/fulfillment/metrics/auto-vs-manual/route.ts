import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";

const AUTO_PLATFORMS: ReadonlySet<string> = new Set(["cj"]);

export const GET = withAuth(async (_req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("fulfillmentOrders").limit(500).get();

    let auto = 0;
    let manual = 0;
    const bySupplier: Record<string, number> = {};
    let needsAssignment = 0;

    for (const doc of snap.docs) {
      const data = doc.data() as {
        assignedSupplier?: string;
        items?: { supplierId?: string }[];
      };
      const supplierId = data.assignedSupplier || data.items?.[0]?.supplierId || null;
      if (!supplierId || supplierId === "unknown" || supplierId === "manual") {
        manual++;
        needsAssignment++;
      } else if (AUTO_PLATFORMS.has(supplierId)) {
        auto++;
      } else {
        manual++;
      }
      const key = supplierId || "unassigned";
      bySupplier[key] = (bySupplier[key] || 0) + 1;
    }

    const total = auto + manual;
    return NextResponse.json({
      auto,
      manual,
      total,
      autoRatio: total > 0 ? Math.round((auto / total) * 100) / 100 : null,
      bySupplier,
      needsAssignment,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compute fulfillment metrics", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);
