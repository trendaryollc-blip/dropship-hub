import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import {
  getModePreferences,
  updateModePreferences,
  setGlobalMode,
  setFeatureMode,
  setAutonomyLevel,
  setGuardrails,
  addAutoRule,
  updateAutoRule,
  deleteAutoRule,
} from "@/lib/ai/modes/user-prefs";
import { getGuardrailStatus } from "@/lib/ai/safety/guardrails";
import { ToolRegistry } from "@/lib/ai/tools/registry";
import type { ExecutionMode, AutonomyLevel } from "@/lib/ai/types";

// ─── GET /api/ai/modes ──────────────────────────────────────────────────────
// Get current mode preferences, available tools, and guardrail status

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "guardrails") {
      const status = await getGuardrailStatus(uid);
      return NextResponse.json(status);
    }

    if (action === "tools") {
      const tools = ToolRegistry.getDefinitions();
      const categories = ToolRegistry.getCategories();
      return NextResponse.json({ tools, categories });
    }

    const preferences = await getModePreferences(uid);
    return NextResponse.json({ preferences });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, LIMITS.AI_CHAT);

// ─── PUT /api/ai/modes ──────────────────────────────────────────────────────
// Update mode preferences

const UpdateModeSchema = z.object({
  action: z.enum(["global", "feature", "autonomy", "guardrails", "auto_rule_add", "auto_rule_update", "auto_rule_delete"]),
  mode: z.enum(["manual", "ai_assist", "auto"]).optional(),
  feature: z.string().optional(),
  autonomyLevel: z.number().int().min(0).max(4).optional(),
  guardrails: z.object({
    maxActionsPerHour: z.number().optional(),
    maxActionsPerDay: z.number().optional(),
    maxCostPerAction: z.number().optional(),
    maxDailyCost: z.number().optional(),
    dollarThresholdForConfirmation: z.number().optional(),
    forbiddenTools: z.array(z.string()).optional(),
  }).optional(),
  rule: z.object({
    id: z.string().optional(),
    toolId: z.string(),
    enabled: z.boolean(),
    trigger: z.enum(["schedule", "event", "threshold"]),
    schedule: z.string().optional(),
    event: z.string().optional(),
    threshold: z.object({
      field: z.string(),
      operator: z.enum(["greater_than", "less_than", "equals"]),
      value: z.number(),
    }).optional(),
    params: z.record(z.string(), z.unknown()),
  }).optional(),
});

export const PUT = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const parseResult = validateBody(UpdateModeSchema, await request.json());
    if (!parseResult.success) return parseResult.response;
    const body = parseResult.data;

    switch (body.action) {
      case "global": {
        if (!body.mode) return NextResponse.json({ error: "mode required" }, { status: 400 });
        const prefs = await setGlobalMode(uid, body.mode);
        return NextResponse.json({ preferences: prefs });
      }

      case "feature": {
        if (!body.feature || !body.mode) return NextResponse.json({ error: "feature and mode required" }, { status: 400 });
        const prefs = await setFeatureMode(uid, body.feature, body.mode);
        return NextResponse.json({ preferences: prefs });
      }

      case "autonomy": {
        if (body.autonomyLevel === undefined) return NextResponse.json({ error: "autonomyLevel required" }, { status: 400 });
        const prefs = await setAutonomyLevel(uid, body.autonomyLevel as AutonomyLevel);
        return NextResponse.json({ preferences: prefs });
      }

      case "guardrails": {
        if (!body.guardrails) return NextResponse.json({ error: "guardrails required" }, { status: 400 });
        const prefs = await setGuardrails(uid, body.guardrails);
        return NextResponse.json({ preferences: prefs });
      }

      case "auto_rule_add": {
        if (!body.rule) return NextResponse.json({ error: "rule required" }, { status: 400 });
        const { id: _addId, ...addData } = body.rule;
        const rule = await addAutoRule(uid, addData as Omit<import("@/lib/ai/types").AutoModeRule, "id" | "uid" | "createdAt" | "updatedAt">);
        return NextResponse.json({ rule });
      }

      case "auto_rule_update": {
        if (!body.rule?.id) return NextResponse.json({ error: "rule.id required" }, { status: 400 });
        const { id: ruleId, ...updates } = body.rule;
        const updated = await updateAutoRule(uid, ruleId, updates);
        if (!updated) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        return NextResponse.json({ rule: updated });
      }

      case "auto_rule_delete": {
        if (!body.rule?.id) return NextResponse.json({ error: "rule.id required" }, { status: 400 });
        const deleted = await deleteAutoRule(uid, body.rule.id);
        if (!deleted) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, LIMITS.AI_CHAT);
