import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6"];

function generateInsights(suppliers: any[]): string[] {
  const insights: string[] = [];
  if (suppliers.length < 2) {
    insights.push("Add at least 2 suppliers for meaningful comparison");
    return insights;
  }

  const bestPrice = suppliers.reduce((best, s) =>
    (s.scores?.price || 0) > (best.scores?.price || 0) ? s : best
  );
  insights.push(`${bestPrice.supplierName} offers the best price competitiveness`);

  const bestQuality = suppliers.reduce((best, s) =>
    (s.scores?.quality || 0) > (best.scores?.quality || 0) ? s : best
  );
  insights.push(`${bestQuality.supplierName} leads in quality score`);

  const bestSpeed = suppliers.reduce((best, s) =>
    (s.scores?.speed || 0) > (best.scores?.speed || 0) ? s : best
  );
  insights.push(`${bestSpeed.supplierName} has the fastest shipping`);

  return insights;
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids")?.split(",") || [];

    if (ids.length === 0) {
      return NextResponse.json({ comparison: { suppliers: [], insights: [] } });
    }

    const suppliers = [];
    for (const id of ids) {
      const snap = await db
        .collection("users")
        .doc(uid)
        .collection("supplierPerformance")
        .where("supplierId", "==", id.trim())
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!snap.empty) {
        const data = snap.docs[0].data();
        suppliers.push({
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          color: COLORS[suppliers.length % COLORS.length],
          scores: {
            price: Math.max(0, 100 - (data.refundRate || 0) * 5),
            speed: Math.max(0, 100 - (data.avgShippingDays || 10) * 3),
            quality: data.reliabilityScore || 70,
            reliability: data.stockReliability || 80,
            communication: Math.min(100, 50 + (data.totalOrders || 0) * 2),
          },
          overallScore: data.reliabilityScore || 70,
        });
      }
    }

    const insights = generateInsights(suppliers);

    return NextResponse.json({ comparison: { suppliers, insights } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
