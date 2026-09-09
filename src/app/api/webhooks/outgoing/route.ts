import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import crypto from "crypto";
import type { OutgoingWebhook } from "@/lib/webhooks/types";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("outgoingWebhooks")
      .orderBy("createdAt", "desc")
      .get();

    const webhooks: OutgoingWebhook[] = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as OutgoingWebhook[];

    return NextResponse.json({ webhooks });
  } catch (err) {
    logger.error("Failed to get outgoing webhooks", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to get webhooks" }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { url, events } = body;

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "URL and events are required" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const invalidEvents = events.filter((e: string) => !["order.created", "order.updated", "order.cancelled", "refund.created", "inventory.updated", "product.updated", "custom"].includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json({ error: `Invalid events: ${invalidEvents.join(", ")}` }, { status: 400 });
    }

    const db = await getAdminDB();
    const secret = crypto.randomBytes(32).toString("hex");

    const docRef = await db.collection("users").doc(uid).collection("outgoingWebhooks").add({
      uid,
      url,
      events,
      secret,
      active: true,
      retryCount: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      id: docRef.id,
      url,
      events,
      secret,
      active: true,
      message: "Webhook created. Save the secret — it won't be shown again.",
    });
  } catch (err) {
    logger.error("Failed to create outgoing webhook", { uid, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
});
