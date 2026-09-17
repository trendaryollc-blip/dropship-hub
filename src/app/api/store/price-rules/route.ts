import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("priceRules").orderBy("createdAt", "desc").get();
    const rules = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch price rules", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { productId, storeId, rule, targetPrice } = body;

    if (!productId || !storeId || !rule) {
      return NextResponse.json({ error: "productId, storeId, and rule are required" }, { status: 400 });
    }

    if (!["below", "above", "changed"].includes(rule)) {
      return NextResponse.json({ error: "rule must be 'below', 'above', or 'changed'" }, { status: 400 });
    }

    if (rule !== "changed" && (targetPrice === undefined || targetPrice === null)) {
      return NextResponse.json({ error: "targetPrice is required for 'below' and 'above' rules" }, { status: 400 });
    }

    // Look up store name for display
    const db = await getAdminDB();
    const connDoc = await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).get();
    const storeName = connDoc.data()?.name || storeId;

    const ruleData = {
      productId,
      productName: body.productName || productId,
      storeId,
      storeName,
      rule,
      targetPrice: targetPrice !== undefined ? Number(targetPrice) : null,
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection("users").doc(uid).collection("priceRules").add(ruleData);
    return NextResponse.json({ success: true, id: ref.id, ...ruleData });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create price rule", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const PATCH = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { ruleId, ...updates } = body;

    if (!ruleId) {
      return NextResponse.json({ error: "ruleId required" }, { status: 400 });
    }

    // Only allow updating enabled and targetPrice
    const allowed: Record<string, unknown> = {};
    if (updates.enabled !== undefined) allowed.enabled = updates.enabled;
    if (updates.targetPrice !== undefined) allowed.targetPrice = Number(updates.targetPrice);

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("priceRules").doc(ruleId).update(allowed);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update price rule", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { ruleId } = body;

    if (!ruleId) {
      return NextResponse.json({ error: "ruleId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("priceRules").doc(ruleId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete price rule", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.DEFAULT);
