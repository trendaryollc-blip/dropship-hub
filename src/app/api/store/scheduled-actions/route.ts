import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("scheduledActions").orderBy("createdAt", "desc").get();
    const actions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ actions });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch scheduled actions", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { name, type, storeIds, schedule } = body;

    if (!name || !type || !storeIds?.length || !schedule?.frequency) {
      return NextResponse.json({ error: "name, type, storeIds, and schedule.frequency are required" }, { status: 400 });
    }

    const validTypes = ["sync_inventory", "push_products", "sync_orders", "generate_report", "optimize_listings"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const validFreqs = ["hourly", "daily", "weekly", "monthly"];
    if (!validFreqs.includes(schedule.frequency)) {
      return NextResponse.json({ error: `frequency must be one of: ${validFreqs.join(", ")}` }, { status: 400 });
    }

    // Look up store names for display
    const db = await getAdminDB();
    const storeNames: Record<string, string> = {};
    for (const sid of storeIds) {
      const connDoc = await db.collection("users").doc(uid).collection("storeConnections").doc(sid).get();
      storeNames[sid] = connDoc.data()?.name || sid;
    }

    const now = new Date();
    let nextRun = now.toISOString();
    if (schedule.frequency === "daily" && schedule.time) {
      const [h, m] = schedule.time.split(":").map(Number);
      const next = new Date(now);
      next.setUTCHours(h, m, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      nextRun = next.toISOString();
    }

    const actionData = {
      name,
      type,
      storeIds,
      storeNames,
      schedule,
      enabled: true,
      lastRun: null,
      nextRun,
      status: null,
      createdAt: now.toISOString(),
    };

    const ref = await db.collection("users").doc(uid).collection("scheduledActions").add(actionData);
    return NextResponse.json({ success: true, id: ref.id, ...actionData });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create scheduled action", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const PATCH = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { actionId, ...updates } = body;

    if (!actionId) {
      return NextResponse.json({ error: "actionId required" }, { status: 400 });
    }

    const allowed: Record<string, unknown> = {};
    if (updates.enabled !== undefined) allowed.enabled = updates.enabled;

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("scheduledActions").doc(actionId).update(allowed);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update scheduled action", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { actionId } = body;

    if (!actionId) {
      return NextResponse.json({ error: "actionId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("scheduledActions").doc(actionId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete scheduled action", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.DEFAULT);
