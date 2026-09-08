import { ToolRegistry } from "../tools/registry";
import type { WorkflowDefinition, WorkflowStep, ToolExecutionContext, ToolResult } from "../types";

// ─── Workflow Runner ─────────────────────────────────────────────────────────
// Executes multi-step workflows with data flow between steps.

interface WorkflowRunResult {
  success: boolean;
  workflowId: string;
  steps: Array<{
    stepIndex: number;
    toolId: string;
    input: Record<string, unknown>;
    result: ToolResult;
    duration: number;
  }>;
  summary: string;
  totalDuration: number;
}

// ─── Execute Workflow ────────────────────────────────────────────────────────

export async function executeWorkflow(
  workflow: WorkflowDefinition,
  initialInput: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<WorkflowRunResult> {
  const startTime = Date.now();
  const stepResults: WorkflowRunResult["steps"] = [];
  const dataContext: Record<string, unknown> = {
    input: initialInput,
    steps: {} as Record<string, { data: unknown; summary: string; success: boolean }>,
  };

  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];
    const stepStart = Date.now();

    // Check condition if present
    if (step.condition) {
      const conditionMet = evaluateCondition(step.condition, dataContext);
      if (!conditionMet) {
        stepResults.push({
          stepIndex: i,
          toolId: step.toolId,
          input: {},
          result: { success: true, data: null, summary: "Skipped (condition not met)" },
          duration: 0,
        });
        continue;
      }
    }

    // Map input from data context
    const mappedInput = mapInput(step.inputMapping, dataContext);

    // Execute the tool
    const tool = ToolRegistry.get(step.toolId);
    if (!tool) {
      stepResults.push({
        stepIndex: i,
        toolId: step.toolId,
        input: mappedInput,
        result: { success: false, data: null, summary: `Tool not found: ${step.toolId}`, error: `Unknown tool: ${step.toolId}` },
        duration: Date.now() - stepStart,
      });
      break;
    }

    let result: ToolResult;
    try {
      result = await ToolRegistry.executeTool(step.toolId, mappedInput, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result = { success: false, data: null, summary: `Execution failed: ${message}`, error: message };
    }

    // Store result in data context
    const stepsData = dataContext.steps as Record<string, { data: unknown; summary: string; success: boolean }>;
    stepsData[step.toolId] = {
      data: result.data,
      summary: result.summary,
      success: result.success,
    };

    stepResults.push({
      stepIndex: i,
      toolId: step.toolId,
      input: mappedInput,
      result,
      duration: Date.now() - stepStart,
    });

    // Stop on failure
    if (!result.success) {
      break;
    }
  }

  const totalDuration = Date.now() - startTime;
  const completedSteps = stepResults.filter((s) => s.result.success).length;
  const failedSteps = stepResults.filter((s) => !s.result.success && s.result.error).length;

  return {
    success: failedSteps === 0,
    workflowId: workflow.id,
    steps: stepResults,
    summary: `Workflow "${workflow.name}": ${completedSteps}/${workflow.steps.length} steps completed in ${(totalDuration / 1000).toFixed(1)}s.`,
    totalDuration,
  };
}

// ─── Map Input ───────────────────────────────────────────────────────────────
// Resolves input mappings like "$input.query" or "$steps.search_products.data[0].id"

function mapInput(
  mapping: Record<string, string>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, template] of Object.entries(mapping)) {
    const value = resolveTemplate(template, context);
    if (typeof value === "string" && value !== "" && !isNaN(Number(value))) {
      result[key] = Number(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ─── Resolve Template ────────────────────────────────────────────────────────

function resolveTemplate(template: string, context: Record<string, unknown>): unknown {
  // If it's not a template string, return as-is
  if (!template.startsWith("$")) {
    return template;
  }

  // Parse path: "$input.query" -> ["input", "query"]
  // "$steps.search_products.data[0].id" -> ["steps", "search_products", "data", "0", "id"]
  const path = template
    .replace(/^\$/, "")
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".");

  let current: unknown = context;
  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

// ─── Evaluate Condition ──────────────────────────────────────────────────────

function evaluateCondition(
  condition: WorkflowStep["condition"],
  context: Record<string, unknown>
): boolean {
  if (!condition) return true;

  const value = resolveTemplate(condition.field, context);

  switch (condition.operator) {
    case "equals":
      return value === condition.value;
    case "not_equals":
      return value !== condition.value;
    case "greater_than":
      return typeof value === "number" && value > (condition.value as number);
    case "less_than":
      return typeof value === "number" && value < (condition.value as number);
    case "contains":
      return typeof value === "string" && value.includes(condition.value as string);
    default:
      return true;
  }
}
