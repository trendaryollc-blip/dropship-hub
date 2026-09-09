import { runTool } from "./runner";
import { getAdminDB } from "@/lib/firebase-admin";
import type {
  ToolCall,
  ToolExecutionContext,
  ToolResult,
  ToolExecutionRecord,
  WorkflowDefinition,
  WorkflowStep,
} from "../types";

// ─── AI Execution Engine ────────────────────────────────────────────────────
// Orchestrates single and multi-tool executions.
// Handles tool-call parsing from LLM output and workflow chaining.

interface _ExecutionPlan {
  toolCalls: ToolCall[];
  requiresConfirmation: string[];
}

interface ExecutionResult {
  results: Array<{
    toolCall: ToolCall;
    result: ToolResult;
    executionRecord: ToolExecutionRecord;
  }>;
  summary: string;
  totalExecuted: number;
  totalFailed: number;
  totalPendingConfirmation: number;
}

// ─── Parse Tool Calls from LLM Response ─────────────────────────────────────

export function parseToolCalls(llmResponse: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  // Try JSON block
  const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        for (const call of parsed.tool_calls) {
          if (call.tool && call.input) {
            toolCalls.push({
              id: call.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              tool: call.tool,
              input: call.input,
            });
          }
        }
        return toolCalls;
      }
    } catch { /* fall through */ }
  }

  // Try inline JSON
  const inlineMatch = llmResponse.match(/\{[\s\S]*"tool_calls"[\s\S]*\}/);
  if (inlineMatch) {
    try {
      const parsed = JSON.parse(inlineMatch[0]);
      if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        for (const call of parsed.tool_calls) {
          if (call.tool && call.input) {
            toolCalls.push({
              id: call.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              tool: call.tool,
              input: call.input,
            });
          }
        }
        return toolCalls;
      }
    } catch { /* fall through */ }
  }

  // Try function_call format (OpenAI-style)
  const funcMatch = llmResponse.match(/"function_call":\s*\{[^}]*"name":\s*"([^"]+)"[^}]*"arguments":\s*"([^"]*)"/);
  if (funcMatch) {
    try {
      const args = JSON.parse(funcMatch[2].replace(/\\"/g, '"'));
      toolCalls.push({
        id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        tool: funcMatch[1],
        input: args,
      });
      return toolCalls;
    } catch { /* fall through */ }
  }

  return toolCalls;
}

// ─── Execute Multiple Tool Calls ────────────────────────────────────────────

export async function executeToolCalls(
  toolCalls: ToolCall[],
  context: ToolExecutionContext,
  options?: {
    autonomyLevel?: number;
    dollarThreshold?: number;
    sequential?: boolean;
  }
): Promise<ExecutionResult> {
  const results: ExecutionResult["results"] = [];
  let totalFailed = 0;
  let totalPendingConfirmation = 0;

  // Sequential execution (default for safety)
  for (const toolCall of toolCalls) {
    const result = await runTool(toolCall.tool, toolCall.input, context, {
      autonomyLevel: options?.autonomyLevel ?? 1,
      dollarThreshold: options?.dollarThreshold ?? 100,
    });

    results.push({
      toolCall,
      result: result.result,
      executionRecord: result.executionRecord,
    });

    if (result.result.error === "confirmation_required") {
      totalPendingConfirmation++;
    } else if (!result.result.success) {
      totalFailed++;
    }
  }

  const summary = buildExecutionSummary(results);

  return {
    results,
    summary,
    totalExecuted: results.length,
    totalFailed,
    totalPendingConfirmation,
  };
}

function buildExecutionSummary(results: ExecutionResult["results"]): string {
  const succeeded = results.filter((r) => r.result.success).length;
  const failed = results.filter((r) => !r.result.success && r.result.error !== "confirmation_required").length;
  const pending = results.filter((r) => r.result.error === "confirmation_required").length;

  const parts: string[] = [];
  if (succeeded > 0) parts.push(`${succeeded} executed`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (pending > 0) parts.push(`${pending} awaiting confirmation`);

  return parts.join(", ") || "No actions taken";
}

// ─── Workflow Execution ─────────────────────────────────────────────────────

export async function executeWorkflow(
  workflow: WorkflowDefinition,
  initialInput: Record<string, unknown>,
  context: ToolExecutionContext,
  options?: {
    autonomyLevel?: number;
    dollarThreshold?: number;
  }
): Promise<{
  results: Array<{ step: WorkflowStep; result: ToolResult }>;
  success: boolean;
  summary: string;
}> {
  const results: Array<{ step: WorkflowStep; result: ToolResult }> = [];
  let currentData: Record<string, unknown> = initialInput;
  let success = true;

  for (const step of workflow.steps) {
    // Check condition if present
    if (step.condition) {
      const fieldValue = currentData[step.condition.field];
      const conditionMet = evaluateCondition(fieldValue, step.condition.operator, step.condition.value);
      if (!conditionMet) {
        results.push({
          step,
          result: { success: true, data: null, summary: "Skipped — condition not met" },
        });
        continue;
      }
    }

    // Map input from current data
    const input: Record<string, unknown> = {};
    for (const [key, sourceField] of Object.entries(step.inputMapping)) {
      input[key] = sourceField.startsWith("$.") 
        ? currentData[sourceField.slice(2)] 
        : sourceField;
    }

    // Execute the tool
    const result = await runTool(step.toolId, input, context, {
      autonomyLevel: options?.autonomyLevel ?? 1,
      dollarThreshold: options?.dollarThreshold ?? 100,
      skipConfirmation: true,
    });

    results.push({ step, result: result.result });

    if (!result.result.success) {
      success = false;
      break;
    }

    // Update current data with result
    if (result.result.data && typeof result.result.data === "object") {
      currentData = { ...currentData, ...result.result.data as Record<string, unknown> };
    }
  }

  const executedCount = results.filter((r) => r.result.success).length;
  const summary = success
    ? `Workflow "${workflow.name}" completed: ${executedCount}/${workflow.steps.length} steps succeeded`
    : `Workflow "${workflow.name}" failed at step ${results.length}/${workflow.steps.length}`;

  return { results, success, summary };
}

function evaluateCondition(
  fieldValue: unknown,
  operator: string,
  expectedValue: string | number | boolean
): boolean {
  switch (operator) {
    case "equals":
      return fieldValue === expectedValue;
    case "not_equals":
      return fieldValue !== expectedValue;
    case "greater_than":
      return typeof fieldValue === "number" && fieldValue > (expectedValue as number);
    case "less_than":
      return typeof fieldValue === "number" && fieldValue < (expectedValue as number);
    case "contains":
      return typeof fieldValue === "string" && fieldValue.includes(expectedValue as string);
    default:
      return false;
  }
}

// ─── Helper: Get recent executions ──────────────────────────────────────────

export async function getRecentExecutions(uid: string, limit: number = 20): Promise<ToolExecutionRecord[]> {
  const db = await getAdminDB();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("aiExecutions")
    .orderBy("startedAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data() as ToolExecutionRecord);
}

export async function getPendingConfirmations(uid: string): Promise<ToolExecutionRecord[]> {
  const db = await getAdminDB();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("aiExecutions")
    .where("status", "==", "awaiting_confirmation")
    .orderBy("startedAt", "desc")
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => doc.data() as ToolExecutionRecord);
}
