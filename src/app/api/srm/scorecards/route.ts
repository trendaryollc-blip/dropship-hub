import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getSupplierScorecards, saveSupplierScorecard } from "@/lib/data/srm";
import type { SupplierScorecard } from "@/types/srm";

const GRADE_THRESHOLDS = [
  { min: 97, grade: "A+" as const },
  { min: 93, grade: "A" as const },
  { min: 90, grade: "A-" as const },
  { min: 87, grade: "B+" as const },
  { min: 83, grade: "B" as const },
  { min: 80, grade: "B-" as const },
  { min: 77, grade: "C+" as const },
  { min: 73, grade: "C" as const },
  { min: 70, grade: "C-" as const },
  { min: 60, grade: "D" as const },
  { min: 0, grade: "F" as const },
];

function calculateGrade(score: number): string {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t.grade;
  }
  return "F";
}

function calculateTrend(history: { date: string; overallScore: number }[]): "improving" | "stable" | "declining" {
  if (history.length < 2) return "stable";
  const recent = history.slice(0, 3);
  const older = history.slice(3, 6);
  if (older.length === 0) return "stable";
  const recentAvg = recent.reduce((s, h) => s + h.overallScore, 0) / recent.length;
  const olderAvg = older.reduce((s, h) => s + h.overallScore, 0) / older.length;
  const diff = recentAvg - olderAvg;
  if (diff > 2) return "improving";
  if (diff < -2) return "declining";
  return "stable";
}

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const scorecards = await getSupplierScorecards(uid);
    return NextResponse.json({ scorecards });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch scorecards", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { supplierId, supplierName, criteria } = body;

    if (!supplierId || !supplierName || !criteria) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Calculate weighted scores
    const processedCriteria = {
      speed: {
        score: criteria.speed.score,
        weight: criteria.speed.weight,
        weightedScore: criteria.speed.score * criteria.speed.weight,
        details: `Speed score: ${criteria.speed.score}/100 (weight: ${(criteria.speed.weight * 100).toFixed(0)}%)`,
        dataPoints: 1,
      },
      quality: {
        score: criteria.quality.score,
        weight: criteria.quality.weight,
        weightedScore: criteria.quality.score * criteria.quality.weight,
        details: `Quality score: ${criteria.quality.score}/100 (weight: ${(criteria.quality.weight * 100).toFixed(0)}%)`,
        dataPoints: 1,
      },
      communication: {
        score: criteria.communication.score,
        weight: criteria.communication.weight,
        weightedScore: criteria.communication.score * criteria.communication.weight,
        details: `Communication score: ${criteria.communication.score}/100 (weight: ${(criteria.communication.weight * 100).toFixed(0)}%)`,
        dataPoints: 1,
      },
      price: {
        score: criteria.price.score,
        weight: criteria.price.weight,
        weightedScore: criteria.price.score * criteria.price.weight,
        details: `Price score: ${criteria.price.score}/100 (weight: ${(criteria.price.weight * 100).toFixed(0)}%)`,
        dataPoints: 1,
      },
      reliability: {
        score: criteria.reliability.score,
        weight: criteria.reliability.weight,
        weightedScore: criteria.reliability.score * criteria.reliability.weight,
        details: `Reliability score: ${criteria.reliability.score}/100 (weight: ${(criteria.reliability.weight * 100).toFixed(0)}%)`,
        dataPoints: 1,
      },
    };

    const overallScore = Object.values(processedCriteria).reduce((sum, c) => sum + c.weightedScore, 0);
    const grade = calculateGrade(overallScore);

    // Get existing scorecard for trend calculation
    const existing = await getSupplierScorecards(uid);
    const existingCard = existing.find((c) => c.supplierId === supplierId);
    const history = existingCard?.history || [];
    const newSnapshot = {
      date: new Date().toISOString().split("T")[0],
      overallScore,
      criteria: {
        speed: criteria.speed.score,
        quality: criteria.quality.score,
        communication: criteria.communication.score,
        price: criteria.price.score,
        reliability: criteria.reliability.score,
      },
    };
    const updatedHistory = [newSnapshot, ...history].slice(0, 30);
    const trend = calculateTrend(updatedHistory);

    const scorecard = {
      supplierId,
      supplierName,
      overallScore,
      criteria: processedCriteria,
      grade: grade as SupplierScorecard["grade"],
      trend,
      lastEvaluated: new Date().toISOString(),
      history: updatedHistory,
    };

    await saveSupplierScorecard(uid, scorecard as import("@/types/srm").SupplierScorecard);

    return NextResponse.json({ success: true, scorecard });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save scorecard", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
