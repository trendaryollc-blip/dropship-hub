import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getTrendPredictions } from "@/lib/data/trend-predictor";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const predictions = await getTrendPredictions(uid, limit);
    return NextResponse.json({ predictions });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch predictions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
