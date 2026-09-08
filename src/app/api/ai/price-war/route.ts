import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, PriceRuleInputSchema } from "@/lib/validation";
import { addPriceRule, getPriceRules, updatePriceRule, deletePriceRule, getPriceWarStats } from "@/lib/data/price-war";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "rules";
    const status = searchParams.get("status") || undefined;

    if (type === "stats") {
      const stats = await getPriceWarStats(uid);
      return NextResponse.json({ stats });
    }

    const rules = await getPriceRules(uid, status);
    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch price war data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(PriceRuleInputSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;
    const ruleId = await addPriceRule(uid, {
      ...data,
      status: "active",
    });

    if (!ruleId) {
      return NextResponse.json({ error: "Failed to create price rule" }, { status: 500 });
    }

    return NextResponse.json({ id: ruleId, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create price rule", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("id");
    if (!ruleId) {
      return NextResponse.json({ error: "Missing rule ID" }, { status: 400 });
    }

    const success = await deletePriceRule(uid, ruleId);
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
