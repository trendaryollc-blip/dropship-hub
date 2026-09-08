import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getInvoices } from "@/lib/billing/stripe";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const invoices = await getInvoices(uid, limit);

    return NextResponse.json({ invoices });
  } catch (err) {
    logger.error("Failed to get invoices", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to get invoices" }, { status: 500 });
  }
});
