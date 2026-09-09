import { ToolRegistry } from "../tools/registry";
import type { ToolExecutionContext, ToolResult, ToolExecutionRecord, AutonomyLevel } from "../types";
import { logToolCalled, logToolExecuted, logToolFailed } from "../safety/audit-log";
import { checkGuardrails, recordAction } from "../safety/guardrails";
import { needsConfirmation, checkDollarThreshold } from "../safety/confirmations";
import { getAdminDB } from "@/lib/firebase-admin";

// ─── Tool Runner ────────────────────────────────────────────────────────────
// Executes a single tool with full safety checks, audit logging, and error
// handling. This is the core execution primitive.

interface RunToolResult {
  executionRecord: ToolExecutionRecord;
  result: ToolResult;
  needsConfirmation: boolean;
  confirmationReason?: string;
}

export async function runTool(
  toolId: string,
  input: Record<string, unknown>,
  context: ToolExecutionContext,
  options?: {
    skipGuardrails?: boolean;
    skipConfirmation?: boolean;
    autonomyLevel?: number;
    dollarThreshold?: number;
  }
): Promise<RunToolResult> {
  const executionId = context.executionId;
  const uid = context.uid;

  // 1. Check if tool exists
  const tool = ToolRegistry.get(toolId);
  if (!tool) {
    const record = createExecutionRecord(toolId, uid, executionId, input, context.trigger, "failed", "Tool not found");
    return {
      executionRecord: record,
      result: { success: false, data: null, summary: `Tool not found: ${toolId}`, error: `Unknown tool: ${toolId}` },
      needsConfirmation: false,
    };
  }

  // 2. Check confirmation requirement
  const autonomyLevel = (options?.autonomyLevel ?? 1) as AutonomyLevel;
  const confirmDecision = needsConfirmation(toolId, input, autonomyLevel, options?.dollarThreshold);

  if (confirmDecision.required && !options?.skipConfirmation) {
    const dollarCheck = checkDollarThreshold(input, options?.dollarThreshold ?? 100);
    const reason = dollarCheck.exceeds
      ? `Estimated value ($${dollarCheck.estimatedDollars.toFixed(2)}) exceeds threshold`
      : confirmDecision.reason;

    const record = createExecutionRecord(toolId, uid, executionId, input, context.trigger, "awaiting_confirmation", reason);
    await saveExecutionRecord(record);

    return {
      executionRecord: record,
      result: {
        success: false,
        data: null,
        summary: `Awaiting confirmation: ${tool.name} — ${reason}`,
        error: "confirmation_required",
      },
      needsConfirmation: true,
      confirmationReason: reason,
    };
  }

  // 3. Check guardrails
  if (!options?.skipGuardrails) {
    const guardrailCheck = await checkGuardrails(uid, toolId, input);
    if (!guardrailCheck.allowed) {
      const record = createExecutionRecord(toolId, uid, executionId, input, context.trigger, "failed", guardrailCheck.reason);
      await saveExecutionRecord(record);
      await logToolFailed(uid, toolId, executionId, input, guardrailCheck.reason!, context.mode, autonomyLevel as AutonomyLevel);

      return {
        executionRecord: record,
        result: { success: false, data: null, summary: guardrailCheck.reason!, error: guardrailCheck.reason },
        needsConfirmation: false,
      };
    }
  }

  // 4. Log tool called
  await logToolCalled(uid, toolId, executionId, input, context.mode, autonomyLevel as AutonomyLevel);

  // 5. Update record to running
  const runningRecord = createExecutionRecord(toolId, uid, executionId, input, context.trigger, "running");
  await saveExecutionRecord(runningRecord);

  // 6. Execute the tool
  const startTime = Date.now();
  try {
    const result = await ToolRegistry.executeTool(toolId, input, context);
    const _duration = Date.now() - startTime;

    // 7. Log success
    await logToolExecuted(uid, toolId, executionId, input, result, context.mode, autonomyLevel as AutonomyLevel);

    // 8. Record action for rate limiting
    const cost = tool.estimatedCost?.(input) ?? 0;
    await recordAction(uid, cost);

    // 9. Save completed record
    const completedRecord: ToolExecutionRecord = {
      ...runningRecord,
      status: result.success ? "completed" : "failed",
      result,
      completedAt: new Date().toISOString(),
      error: result.error ?? null,
    };
    await saveExecutionRecord(completedRecord);

    return {
      executionRecord: completedRecord,
      result,
      needsConfirmation: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Log failure
    await logToolFailed(uid, toolId, executionId, input, message, context.mode, autonomyLevel as AutonomyLevel);

    // Save failed record
    const failedRecord: ToolExecutionRecord = {
      ...runningRecord,
      status: "failed",
      result: { success: false, data: null, summary: `Execution failed: ${message}`, error: message },
      completedAt: new Date().toISOString(),
      error: message,
    };
    await saveExecutionRecord(failedRecord);

    return {
      executionRecord: failedRecord,
      result: { success: false, data: null, summary: `Execution failed: ${message}`, error: message },
      needsConfirmation: false,
    };
  }
}

function createExecutionRecord(
  toolId: string,
  uid: string,
  executionId: string,
  input: Record<string, unknown>,
  trigger: ToolExecutionContext["trigger"],
  status: ToolExecutionRecord["status"],
  error?: string
): ToolExecutionRecord {
  return {
    id: executionId,
    toolId,
    uid,
    input,
    result: null,
    status,
    startedAt: new Date().toISOString(),
    completedAt: null,
    error: error ?? null,
    trigger,
    confirmed: false,
  };
}

async function saveExecutionRecord(record: ToolExecutionRecord): Promise<void> {
  const db = await getAdminDB();
  if (!db) {
    console.warn("[runner] getAdminDB unavailable — cannot save execution record:", record.id);
    return;
  }
  await db
    .collection("users")
    .doc(record.uid)
    .collection("aiExecutions")
    .doc(record.id)
    .set(record, { merge: true });
}

export async function getExecutionRecord(uid: string, executionId: string): Promise<ToolExecutionRecord | null> {
  const db = await getAdminDB();
  if (!db) {
    console.warn("[runner] getAdminDB unavailable — cannot get execution record:", executionId);
    return null;
  }
  const doc = await db
    .collection("users")
    .doc(uid)
    .collection("aiExecutions")
    .doc(executionId)
    .get();

  return doc.exists ? (doc.data() as ToolExecutionRecord) : null;
}

export async function confirmExecution(uid: string, executionId: string): Promise<RunToolResult | null> {
  const record = await getExecutionRecord(uid, executionId);
  if (!record || record.status !== "awaiting_confirmation") {
    return null;
  }

  const db = await getAdminDB();
  if (!db) {
    console.warn("[runner] getAdminDB unavailable — cannot confirm execution:", executionId);
    return null;
  }

  // Mark as confirmed
  await db
    .collection("users")
    .doc(uid)
    .collection("aiExecutions")
    .doc(executionId)
    .update({ confirmed: true, status: "running" });

  // Re-run with skipConfirmation
  return runTool(record.toolId, record.input, {
    uid,
    executionId,
    trigger: record.trigger,
    mode: "ai_assist",
  }, {
    skipConfirmation: true,
    skipGuardrails: true,
  });
}

export async function cancelExecution(uid: string, executionId: string): Promise<boolean> {
  const record = await getExecutionRecord(uid, executionId);
  if (!record || (record.status !== "awaiting_confirmation" && record.status !== "pending" && record.status !== "running")) {
    return false;
  }

  const db = await getAdminDB();
  if (!db) {
    console.warn("[runner] getAdminDB unavailable — cannot cancel execution:", executionId);
    return false;
  }

  await db
    .collection("users")
    .doc(uid)
    .collection("aiExecutions")
    .doc(executionId)
    .update({ status: "cancelled", completedAt: new Date().toISOString() });

  return true;
}
