import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { retryWebhook } from "@/lib/webhooks/outgoing";
import { logger } from "@/lib/logger";

export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Webhook ID required" }, { status: 400 });

    const body = await request.json();
    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("outgoingWebhooks").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.url !== undefined) updates.url = body.url;
    if (body.events !== undefined) updates.events = body.events;
    if (body.active !== undefined) updates.active = body.active;

    await docRef.update(updates);

    return NextResponse.json({ id, ...updates });
  } catch (err) {
    logger.error("Failed to update outgoing webhook", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Webhook ID required" }, { status: 400 });

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection("outgoingWebhooks").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

    await docRef.delete();

    return NextResponse.json({ deleted: true });
  } catch (err) {
    logger.error("Failed to delete outgoing webhook", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }
});
