import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getTrendPredictions } from "@/lib/data/trend-predictor";
import { safeErrorMessage } from "@/lib/api-errors";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

    const predictions = await getTrendPredictions(uid, limit);
    return NextResponse.json({ predictions });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch predictions", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});
