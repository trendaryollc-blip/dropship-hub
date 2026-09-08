import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import { confirmExecution, cancelExecution, getExecutionRecord } from "@/lib/ai/engine/runner";
import { logToolConfirmed, logToolCancelled } from "@/lib/ai/safety/audit-log";
import { getAutonomyLevel } from "@/lib/ai/modes/user-prefs";

// ─── POST /api/ai/confirm ───────────────────────────────────────────────────
// Confirm or cancel a pending tool execution

const ConfirmSchema = z.object({
  executionId: z.string().min(1),
  action: z.enum(["confirm", "cancel"]),
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const parseResult = validateBody(ConfirmSchema, await request.json());
    if (!parseResult.success) return parseResult.response;
    const { executionId, action } = parseResult.data;

    const autonomyLevel = await getAutonomyLevel(uid);

    if (action === "confirm") {
      const result = await confirmExecution(uid, executionId);
      if (!result) {
        return NextResponse.json(
          { error: "Execution not found or not awaiting confirmation" },
          { status: 404 }
        );
      }

      await logToolConfirmed(uid, result.executionRecord.toolId, executionId, "ai_assist", autonomyLevel);

      return NextResponse.json({
        success: true,
        result: {
          tool: result.executionRecord.toolId,
          success: result.result.success,
          summary: result.result.summary,
          data: result.result.data,
        },
      });
    }

    if (action === "cancel") {
      const cancelled = await cancelExecution(uid, executionId);
      if (!cancelled) {
        return NextResponse.json(
          { error: "Execution not found or cannot be cancelled" },
          { status: 404 }
        );
      }

      const record = await getExecutionRecord(uid, executionId);
      if (record) {
        await logToolCancelled(uid, record.toolId, executionId, "ai_assist", autonomyLevel);
      }

      return NextResponse.json({ success: true, message: "Action cancelled" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, LIMITS.AI_CHAT);

// ─── GET /api/ai/confirm ────────────────────────────────────────────────────
// Get a specific execution record

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const url = new URL(request.url);
    const executionId = url.searchParams.get("executionId");

    if (!executionId) {
      return NextResponse.json({ error: "executionId required" }, { status: 400 });
    }

    const record = await getExecutionRecord(uid, executionId);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, LIMITS.AI_CHAT);
