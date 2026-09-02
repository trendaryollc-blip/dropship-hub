import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateRule, createDefaultRules } from "@/lib/fulfillment/rules-engine";
import { FulfillmentRuleSchema } from "@/types/automation";
import type { FulfillmentRule } from "@/types/automation";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("fulfillmentRules").orderBy("priority", "asc").get();

    if (snap.empty) {
      const defaults = createDefaultRules();
      for (const rule of defaults) {
        await db.collection("users").doc(uid).collection("fulfillmentRules").doc(rule.id).set(rule);
      }
      return NextResponse.json({ rules: defaults });
    }

    const rules = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FulfillmentRule));
    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rules", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { rule } = body;

    if (!rule) {
      return NextResponse.json({ error: "rule object required" }, { status: 400 });
    }

    const validation = validateRule(rule);
    if (!validation.valid) {
      return NextResponse.json({ error: "Invalid rule", details: validation.errors }, { status: 400 });
    }

    const db = await getAdminDB();
    const ruleId = rule.id || `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const savedRule: FulfillmentRule = {
      ...rule,
      id: ruleId,
      createdAt: rule.createdAt || now,
      updatedAt: now,
    };

    await db.collection("users").doc(uid).collection("fulfillmentRules").doc(ruleId).set(savedRule);

    return NextResponse.json({ success: true, rule: savedRule });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save rule", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

export const PUT = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { ruleId, updates } = body;

    if (!ruleId || !updates) {
      return NextResponse.json({ error: "ruleId and updates required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const ruleDoc = await db.collection("users").doc(uid).collection("fulfillmentRules").doc(ruleId).get();
    if (!ruleDoc.exists) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const existing = ruleDoc.data() as FulfillmentRule;
    const updatedRule = {
      ...existing,
      ...updates,
      id: ruleId,
      updatedAt: new Date().toISOString(),
    };

    const validation = validateRule(updatedRule);
    if (!validation.valid) {
      return NextResponse.json({ error: "Invalid rule", details: validation.errors }, { status: 400 });
    }

    await db.collection("users").doc(uid).collection("fulfillmentRules").doc(ruleId).set(updatedRule, { merge: true });

    return NextResponse.json({ success: true, rule: updatedRule });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update rule", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const ruleId = req.nextUrl.searchParams.get("ruleId");
    if (!ruleId) {
      return NextResponse.json({ error: "ruleId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("fulfillmentRules").doc(ruleId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete rule", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);
