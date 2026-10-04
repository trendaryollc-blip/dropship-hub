import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";
import {
  recordProductPriceSnapshot,
  getProductPriceHistory,
} from "@/lib/products/price-tracker";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const key = new URL(req.url).searchParams.get("key");
    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
    const days = Number(new URL(req.url).searchParams.get("days") || 90);
    const history = await getProductPriceHistory(uid, key, Number.isFinite(days) ? days : 90);
    return NextResponse.json({ key, history });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch price history", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { key, title, prices } = body as {
      key?: string;
      title?: string;
      prices?: Record<string, number>;
    };
    if (!key || !title || !prices || typeof prices !== "object") {
      return NextResponse.json({ error: "key, title, and prices are required" }, { status: 400 });
    }
    await recordProductPriceSnapshot(uid, key, title, prices);
    return NextResponse.json({ success: true, key });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to record price snapshot", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
