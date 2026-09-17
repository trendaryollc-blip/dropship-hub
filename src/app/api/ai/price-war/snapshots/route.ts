import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getPriceSnapshots } from "@/lib/data/price-war";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (!ruleId) {
      return NextResponse.json({ error: "Missing ruleId parameter" }, { status: 400 });
    }

    const snapshots = await getPriceSnapshots(uid, ruleId, days);
    return NextResponse.json({ snapshots });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch price snapshots", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
