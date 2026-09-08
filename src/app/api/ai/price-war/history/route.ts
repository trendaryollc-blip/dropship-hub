import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getPriceAdjustmentLogs } from "@/lib/data/price-war";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const logs = await getPriceAdjustmentLogs(uid, ruleId, limit);
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch price history", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
