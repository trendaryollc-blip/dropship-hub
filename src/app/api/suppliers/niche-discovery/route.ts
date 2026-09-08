import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

function calculateNicheScore(supplier: {
  uniqueProducts: number;
  trendingProducts: number;
  totalProducts: number;
  avgMargin: number;
  competitionCount: number;
}): number {
  let score = 50;
  const uniqueness = supplier.totalProducts > 0 ? supplier.uniqueProducts / supplier.totalProducts : 0;
  score += uniqueness * 20;
  score += Math.min(20, supplier.trendingProducts * 2);
  score += supplier.avgMargin * 0.2;
  score -= Math.min(20, supplier.competitionCount * 2);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getSaturationLevel(density: number): "low" | "medium" | "high" | "saturated" {
  if (density < 20) return "low";
  if (density < 50) return "medium";
  if (density < 80) return "high";
  return "saturated";
}

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const scoresSnap = await db
      .collection("users")
      .doc(uid)
      .collection("supplierNicheScores")
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    let scores = scoresSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (category) {
      scores = scores.filter((s: any) =>
        s.categoryBreakdown?.some((c: any) => c.category === category)
      );
    }

    return NextResponse.json({ scores });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
