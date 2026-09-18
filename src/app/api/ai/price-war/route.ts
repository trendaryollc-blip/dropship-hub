import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, PriceRuleInputSchema } from "@/lib/validation";
import { addPriceRule, getPriceRules, deletePriceRule, updatePriceRule, getPriceWarStats } from "@/lib/data/price-war";
import { safeErrorMessage } from "@/lib/api-errors";

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
      { error: "Failed to fetch price war data", details: safeErrorMessage(error, "Unknown error") },
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
      { error: "Failed to create price rule", details: safeErrorMessage(error, "Unknown error") },
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
      { error: "Failed to delete rule", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { ruleId, ...updates } = body as { ruleId: string; [key: string]: unknown };

    if (!ruleId) {
      return NextResponse.json({ error: "Missing rule ID" }, { status: 400 });
    }

    const allowedFields: Record<string, unknown> = {};
    const fieldKeys = [
      "productTitle", "productImage", "productUrl", "myPrice", "cost",
      "floorPrice", "minMargin", "strategy", "strategyConfig",
      "platforms", "competitorUrls", "status",
    ] as const;

    for (const key of fieldKeys) {
      if (key in updates) {
        (allowedFields as Record<string, unknown>)[key] = updates[key];
      }
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const success = await updatePriceRule(uid, ruleId, allowedFields);
    if (!success) {
      return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update rule", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { ruleIds, action } = body as { ruleIds: string[]; action: "pause" | "resume" | "delete" };

    if (!ruleIds || !Array.isArray(ruleIds) || ruleIds.length === 0) {
      return NextResponse.json({ error: "Missing ruleIds array" }, { status: 400 });
    }

    if (!["pause", "resume", "delete"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    let affected = 0;
    for (const id of ruleIds) {
      if (action === "delete") {
        const ok = await deletePriceRule(uid, id);
        if (ok) affected++;
      } else {
        const ok = await updatePriceRule(uid, id, { status: action === "pause" ? "paused" : "active" });
        if (ok) affected++;
      }
    }

    return NextResponse.json({ success: true, affected });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to perform bulk action", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});
