import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getStorePerformances, saveStorePerformance } from "@/lib/data/multi-store";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "30d") as "7d" | "30d" | "90d";

    const performances = await getStorePerformances(uid, period);
    return NextResponse.json({ performances });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch store performances", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { storeId, storeName, storePlatform, metrics, trends, period } = body;

    if (!storeId || !storeName || !metrics) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await saveStorePerformance(uid, {
      storeId,
      storeName,
      storePlatform: storePlatform || "",
      metrics,
      trends: trends || { ordersTrend: 0, revenueTrend: 0, profitTrend: 0 },
      period: period || "30d",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save store performance", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
