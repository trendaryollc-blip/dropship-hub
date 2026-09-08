import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, EscalationRuleInputSchema } from "@/lib/validation";
import { addEscalationRule, getEscalationRules, updateEscalationRule, deleteEscalationRule } from "@/lib/data/cs-enhanced";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const rules = await getEscalationRules(uid);
    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch escalation rules", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(EscalationRuleInputSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;
    const ruleId = await addEscalationRule(uid, data);

    if (!ruleId) {
      return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
    }

    return NextResponse.json({ id: ruleId, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create escalation rule", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const PUT = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { ruleId, ...updates } = body;

    if (!ruleId) {
      return NextResponse.json({ error: "Missing ruleId" }, { status: 400 });
    }

    const success = await updateEscalationRule(uid, ruleId, updates);
    if (!success) {
      return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update rule", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("id");
    if (!ruleId) {
      return NextResponse.json({ error: "Missing rule ID" }, { status: 400 });
    }

    const success = await deleteEscalationRule(uid, ruleId);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete rule", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
