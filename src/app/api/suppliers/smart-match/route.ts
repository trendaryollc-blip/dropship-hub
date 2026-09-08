import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

function calculateMatchScore(
  supplier: any,
  preferences: {
    speed: number;
    price: number;
    quality: number;
    reliability: number;
  }
): number {
  let score = 0;
  if (supplier.stats) {
    score += (100 - supplier.stats.shippingDays * 3) * (preferences.speed / 100) * 0.25;
    score += supplier.stats.reliabilityScore * (preferences.reliability / 100) * 0.3;
    score += supplier.stats.qualityScore * (preferences.quality / 100) * 0.25;
    score += supplier.stats.priceCompetitiveness * (preferences.price / 100) * 0.2;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getRole(score: number): "primary" | "backup" | "niche" | "seasonal" {
  if (score >= 80) return "primary";
  if (score >= 60) return "backup";
  if (score >= 40) return "niche";
  return "seasonal";
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const body = await request.json();
    const { niche, targetAudience, priceRange, monthlyVolume, priorities } = body;

    if (!niche || !priorities) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const suppliersSnap = await db.collectionGroup("suppliers").limit(100).get();
    const suppliers = suppliersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const recommendations = suppliers.map((supplier: any) => {
      const matchScore = calculateMatchScore(supplier, priorities);
      const role = getRole(matchScore);
      return {
        supplierId: supplier.id || supplier.supplierId,
        supplierName: supplier.name || supplier.supplierName || "Unknown",
        role,
        categories: supplier.specializations || [],
        reason: `${role} supplier with ${matchScore}% match for ${niche}`,
        matchScore,
        estimatedMargin: priceRange ? ((priceRange.max - priceRange.min) / priceRange.max) * 100 : 0,
        riskMitigation: matchScore >= 70 ? "Low risk - well matched" : "Review supplier history before committing",
        synergy: `Aligns with ${niche} niche targeting ${targetAudience || "general audience"}`,
      };
    });

    recommendations.sort((a: any, b: any) => b.matchScore - a.matchScore);

    const result = {
      id: `match-${Date.now()}`,
      userId: uid,
      storeProfile: { niche, targetAudience, priceRange, monthlyVolume, priorities },
      generatedAt: new Date().toISOString(),
      recommendations: recommendations.slice(0, 10),
      portfolioSummary: {
        totalSuppliers: recommendations.length,
        estimatedMonthlyCost: monthlyVolume ? monthlyVolume * (priceRange?.min || 10) : 0,
        estimatedAvgMargin: priceRange ? ((priceRange.max - priceRange.min) / priceRange.max) * 100 : 0,
        riskScore: Math.max(0, 100 - (recommendations.length * 10)),
        coverageScore: Math.min(100, recommendations.length * 15),
      },
    };

    const resultRef = db
      .collection("users")
      .doc(uid)
      .collection("supplierMatchResults")
      .doc(result.id);

    await resultRef.set(result);

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
