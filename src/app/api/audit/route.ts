import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { addAuditEntry, getAuditEntries, getAuditStats } from "@/lib/data/audit";
import type { AuditAction, AuditFilter } from "@/types/business-health";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "list";

    if (type === "stats") {
      const stats = await getAuditStats(uid);
      return NextResponse.json({ stats });
    }

    const filter: AuditFilter = {};
    if (searchParams.get("action")) filter.action = searchParams.get("action") as AuditAction;
    if (searchParams.get("entityType")) filter.entityType = searchParams.get("entityType")!;
    if (searchParams.get("severity")) filter.severity = searchParams.get("severity") as "info" | "warning" | "critical";
    if (searchParams.get("limit")) filter.limit = Number(searchParams.get("limit"));

    const entries = await getAuditEntries(uid, filter);
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action, entityType, entityId, entityName, details, severity } = body;

    if (!action || !entityType) {
      return NextResponse.json({ error: "action and entityType are required" }, { status: 400 });
    }

    const id = await addAuditEntry(uid, {
      action: action as AuditAction,
      entityType,
      entityId,
      entityName,
      details: details || {},
      severity: severity || "info",
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
});
