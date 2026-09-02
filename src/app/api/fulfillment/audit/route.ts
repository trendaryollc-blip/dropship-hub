import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getAuditLogs, getAuditLogCount, getAuditStats, clearAuditLogs } from "@/lib/fulfillment/audit-logger";
import type { AuditAction } from "@/types/automation";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const orderId = req.nextUrl.searchParams.get("orderId") || undefined;
    const action = req.nextUrl.searchParams.get("action") as AuditAction | null;
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0", 10);
    const statsOnly = req.nextUrl.searchParams.get("stats") === "true";

    if (statsOnly) {
      const stats = getAuditStats(uid);
      return NextResponse.json({ stats });
    }

    const logs = getAuditLogs(uid, {
      orderId,
      action: action || undefined,
      limit,
      offset,
    });

    const total = getAuditLogCount(uid, orderId);

    return NextResponse.json({ logs, total, offset, limit });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch audit logs", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const orderId = req.nextUrl.searchParams.get("orderId") || undefined;
    const cleared = clearAuditLogs(uid, orderId);
    return NextResponse.json({ success: true, cleared });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to clear audit logs", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);
