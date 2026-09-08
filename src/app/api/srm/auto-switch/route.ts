import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import {
  getAutoSwitchRules, addAutoSwitchRule, updateAutoSwitchRule,
  deleteAutoSwitchRule, getSupplierScorecards, addSupplierSwitchLog,
} from "@/lib/data/srm";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const rules = await getAutoSwitchRules(uid);
    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch auto-switch rules", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action: requestAction } = body;

    if (requestAction === "check") {
      // Check all rules against current scorecards
      const rules = await getAutoSwitchRules(uid);
      const scorecards = await getSupplierScorecards(uid);
      const triggered: { ruleId: string; supplierName: string; action: string; score: number }[] = [];

      for (const rule of rules) {
        if (!rule.enabled) continue;
        const scorecard = scorecards.find((s) => s.supplierId === rule.supplierId);
        if (!scorecard) continue;

        let currentValue: number;
        switch (rule.metric) {
          case "overall_score":
            currentValue = scorecard.overallScore;
            break;
          case "speed":
            currentValue = scorecard.criteria.speed.score;
            break;
          case "quality":
            currentValue = scorecard.criteria.quality.score;
            break;
          case "communication":
            currentValue = scorecard.criteria.communication.score;
            break;
          case "price":
            currentValue = scorecard.criteria.price.score;
            break;
          case "reliability":
            currentValue = scorecard.criteria.reliability.score;
            break;
          default:
            currentValue = scorecard.overallScore;
        }

        if (currentValue < rule.threshold) {
          triggered.push({
            ruleId: rule.id,
            supplierName: rule.supplierName,
            action: rule.action,
            score: currentValue,
          });

          // Update trigger count
          await updateAutoSwitchRule(uid, rule.id, {
            lastTriggered: new Date().toISOString(),
            triggerCount: rule.triggerCount + 1,
          });

          // If auto_switch and fallback exists, create switch log
          if (rule.action === "auto_switch" && rule.fallbackSupplierId && rule.fallbackSupplierName) {
            await addSupplierSwitchLog(uid, {
              fromSupplierId: rule.supplierId,
              fromSupplierName: rule.supplierName,
              toSupplierId: rule.fallbackSupplierId,
              toSupplierName: rule.fallbackSupplierName,
              reason: `${rule.metric} score ${currentValue} fell below threshold ${rule.threshold}`,
              triggerType: "auto",
              productIds: [],
              switchedAt: new Date().toISOString(),
            });
          }
        }
      }

      return NextResponse.json({ triggered, totalChecked: rules.length });
    }

    // Create new rule
    const { supplierId, supplierName, enabled, threshold, metric, action: ruleAction, fallbackSupplierId, fallbackSupplierName } = body;
    if (!supplierId || !supplierName || threshold === undefined || !metric || !ruleAction) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ruleId = await addAutoSwitchRule(uid, {
      supplierId,
      supplierName,
      enabled: enabled ?? true,
      threshold,
      metric,
      action: ruleAction,
      fallbackSupplierId,
      fallbackSupplierName,
      triggerCount: 0,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: ruleId });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process auto-switch rule", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const PUT = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { ruleId, ...updates } = body;
    if (!ruleId) return NextResponse.json({ error: "ruleId required" }, { status: 400 });

    await updateAutoSwitchRule(uid, ruleId, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update rule", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const ruleId = req.nextUrl.searchParams.get("ruleId");
    if (!ruleId) return NextResponse.json({ error: "ruleId required" }, { status: 400 });

    await deleteAutoSwitchRule(uid, ruleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete rule", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
