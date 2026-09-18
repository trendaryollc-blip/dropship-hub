import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getOverallAccuracy, getPredictionAccuracy } from "@/lib/trends/accuracy";
import { safeErrorMessage } from "@/lib/api-errors";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "overall") {
      const stats = await getOverallAccuracy(uid);
      return NextResponse.json(stats);
    }

    const count = Math.min(200, Math.max(1, parseInt(searchParams.get("count") || "50", 10) || 50));
    const accuracies = await getPredictionAccuracy(uid, count);
    return NextResponse.json({ accuracies });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch accuracy data", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});
