import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import { runTool, confirmExecution, cancelExecution } from "@/lib/ai/engine/runner";
import { getRecentExecutions, getPendingConfirmations } from "@/lib/ai/engine/executor";
import { executeToolCalls, parseToolCalls } from "@/lib/ai/engine/executor";
import { getAutonomyLevel } from "@/lib/ai/modes/user-prefs";
import { evaluateToolExecution, toolIdToFeature } from "@/lib/ai/modes/evaluator";
import { getModePreferences } from "@/lib/ai/modes/user-prefs";

// ─── POST /api/ai/execute ───────────────────────────────────────────────────
// Execute a tool call, or execute tool calls parsed from LLM response

const ExecuteSchema = z.object({
  tool: z.string().optional(),
  input: z.record(z.string(), z.unknown()).optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    tool: z.string(),
    input: z.record(z.string(), z.unknown()),
  })).optional(),
  llmResponse: z.string().optional(),
  executionId: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const parseResult = validateBody(ExecuteSchema, await request.json());
    if (!parseResult.success) return parseResult.response;
    const body = parseResult.data;

    const autonomyLevel = await getAutonomyLevel(uid);
    const prefs = await getModePreferences(uid);

    // If llmResponse is provided, parse tool calls from it
    if (body.llmResponse) {
      const toolCalls = parseToolCalls(body.llmResponse);
      if (toolCalls.length === 0) {
        return NextResponse.json({ success: true, toolCalls: [], message: "No tool calls found in response" });
      }

      const results = await executeToolCalls(toolCalls, {
        uid,
        executionId: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        trigger: "ai_chat",
        mode: "ai_assist",
      }, {
        autonomyLevel,
        dollarThreshold: prefs.guardrails.dollarThresholdForConfirmation,
      });

      return NextResponse.json({
        success: true,
        results: results.results.map((r) => ({
          tool: r.toolCall.tool,
          success: r.result.success,
          summary: r.result.summary,
          data: r.result.data,
          needsConfirmation: r.result.error === "confirmation_required",
          executionId: r.executionRecord.id,
        })),
        summary: results.summary,
        totalExecuted: results.totalExecuted,
        totalFailed: results.totalFailed,
        totalPendingConfirmation: results.totalPendingConfirmation,
      });
    }

    // Single tool execution
    if (body.tool) {
      const feature = toolIdToFeature(body.tool);
      const evalResult = await evaluateToolExecution(uid, body.tool, feature);

      if (!evalResult.shouldExecute) {
        return NextResponse.json({
          success: false,
          error: evalResult.reason,
          mode: evalResult.mode,
        }, { status: 403 });
      }

      const executionId = body.executionId || `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const result = await runTool(body.tool, body.input || {}, {
        uid,
        executionId,
        trigger: "ai_chat",
        mode: evalResult.mode,
      }, {
        autonomyLevel,
        dollarThreshold: prefs.guardrails.dollarThresholdForConfirmation,
      });

      return NextResponse.json({
        success: result.result.success,
        summary: result.result.summary,
        data: result.result.data,
        error: result.result.error,
        executionId: result.executionRecord.id,
        needsConfirmation: result.needsConfirmation,
        confirmationReason: result.confirmationReason,
      });
    }

    return NextResponse.json({ error: "Provide either 'tool' or 'llmResponse'" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, LIMITS.AI_CHAT);

// ─── GET /api/ai/execute ────────────────────────────────────────────────────
// Get recent executions or pending confirmations

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "pending") {
      const pending = await getPendingConfirmations(uid);
      return NextResponse.json({ pending });
    }

    const limit = parseInt(url.searchParams.get("limit") || "20");
    const executions = await getRecentExecutions(uid, limit);
    return NextResponse.json({ executions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, LIMITS.AI_CHAT);
