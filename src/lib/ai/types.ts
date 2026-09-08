import { z } from "zod";

// ─── Tool Safety Level ──────────────────────────────────────────────────────

export type ToolSafetyLevel = "safe" | "moderate" | "dangerous";

// ─── Tool Category ──────────────────────────────────────────────────────────

export type ToolCategory =
  | "search"
  | "analysis"
  | "action"
  | "data"
  | "financial"
  | "fulfillment"
  | "store"
  | "supplier"
  | "pricing"
  | "listing"
  | "monitoring"
  | "shipping"
  | "notification";

// ─── Autonomy Level ─────────────────────────────────────────────────────────

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  0: "Advisory Only",
  1: "Ask Every Time",
  2: "Smart Auto",
  3: "Mostly Auto",
  4: "Full Auto",
};

// ─── Execution Mode ─────────────────────────────────────────────────────────

export type ExecutionMode = "manual" | "ai_assist" | "auto";

// ─── Tool Definition ────────────────────────────────────────────────────────

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  safetyLevel: ToolSafetyLevel;
  inputSchema: z.ZodSchema;
  estimatedCost?: (input: Record<string, unknown>) => number;
}

// ─── Tool Execution ─────────────────────────────────────────────────────────

export interface ToolExecutionContext {
  uid: string;
  executionId: string;
  trigger: "ai_chat" | "workflow" | "scheduled" | "manual";
  businessContext?: Record<string, unknown>;
  mode: ExecutionMode;
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  summary: string;
  actions?: Array<{ label: string; href: string }>;
  rollbackId?: string;
  error?: string;
}

export interface ToolExecutionRecord {
  id: string;
  toolId: string;
  uid: string;
  input: Record<string, unknown>;
  result: ToolResult | null;
  status: "pending" | "running" | "completed" | "failed" | "cancelled" | "awaiting_confirmation";
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  trigger: "ai_chat" | "workflow" | "scheduled" | "manual";
  confirmed: boolean;
}

// ─── Tool Call (from LLM) ───────────────────────────────────────────────────

export interface ToolCall {
  id: string;
  tool: string;
  input: Record<string, unknown>;
}

// ─── Workflow ───────────────────────────────────────────────────────────────

export interface WorkflowStep {
  toolId: string;
  inputMapping: Record<string, string>;
  condition?: {
    field: string;
    operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
    value: string | number | boolean;
  };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  autoTrigger?: {
    event: string;
    conditions: Record<string, unknown>;
  };
}

// ─── Auto Mode Rule ─────────────────────────────────────────────────────────

export interface AutoModeRule {
  id: string;
  uid: string;
  toolId: string;
  enabled: boolean;
  trigger: "schedule" | "event" | "threshold";
  schedule?: string;
  event?: string;
  threshold?: {
    field: string;
    operator: "greater_than" | "less_than" | "equals";
    value: number;
  };
  params: Record<string, unknown>;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Audit Log Entry ────────────────────────────────────────────────────────

export interface AIAuditLogEntry {
  id: string;
  uid: string;
  toolId: string;
  executionId: string;
  action: "tool_called" | "tool_executed" | "tool_failed" | "tool_confirmed" | "tool_cancelled" | "workflow_started" | "workflow_completed" | "workflow_failed";
  input: Record<string, unknown>;
  result?: unknown;
  error?: string;
  mode: ExecutionMode;
  autonomyLevel: AutonomyLevel;
  timestamp: string;
}

// ─── Guardrail Config ───────────────────────────────────────────────────────

export interface GuardrailConfig {
  maxActionsPerHour: number;
  maxActionsPerDay: number;
  maxCostPerAction: number;
  maxDailyCost: number;
  dollarThresholdForConfirmation: number;
  forbiddenTools: string[];
  blockedInputPatterns: string[];
}

// ─── Mode Preferences ───────────────────────────────────────────────────────

export interface AIModePreferences {
  uid: string;
  globalMode: ExecutionMode;
  featureModes: Record<string, ExecutionMode>;
  autonomyLevel: AutonomyLevel;
  autoRules: AutoModeRule[];
  guardrails: GuardrailConfig;
  createdAt: string;
  updatedAt: string;
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

export const ToolCallSchema = z.object({
  id: z.string(),
  tool: z.string(),
  input: z.record(z.string(), z.unknown()),
});

export const ExecutionModeSchema = z.enum(["manual", "ai_assist", "auto"]);
export const AutonomyLevelSchema = z.number().int().min(0).max(4);
export const ToolSafetyLevelSchema = z.enum(["safe", "moderate", "dangerous"]);

export const ToolExecutionRecordSchema = z.object({
  id: z.string(),
  toolId: z.string(),
  uid: z.string(),
  input: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(["pending", "running", "completed", "failed", "cancelled", "awaiting_confirmation"]),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  error: z.string().nullable(),
  trigger: z.enum(["ai_chat", "workflow", "scheduled", "manual"]),
  confirmed: z.boolean(),
});

export const GuardrailConfigSchema = z.object({
  maxActionsPerHour: z.number().min(1).max(1000),
  maxActionsPerDay: z.number().min(1).max(10000),
  maxCostPerAction: z.number().min(0).max(100),
  maxDailyCost: z.number().min(0).max(1000),
  dollarThresholdForConfirmation: z.number().min(0).max(10000),
  forbiddenTools: z.array(z.string()),
  blockedInputPatterns: z.array(z.string()),
});

export const AutoModeRuleSchema = z.object({
  id: z.string(),
  uid: z.string(),
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
  lastRunAt: z.string().nullable(),
  nextRunAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AIModePreferencesSchema = z.object({
  uid: z.string(),
  globalMode: ExecutionModeSchema,
  featureModes: z.record(z.string(), ExecutionModeSchema),
  autonomyLevel: AutonomyLevelSchema,
  autoRules: z.array(AutoModeRuleSchema),
  guardrails: GuardrailConfigSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ─── Tool Registration Helper Types ─────────────────────────────────────────

export type ToolExecuteFn = (
  input: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolResult>;

export interface ToolRegistration extends ToolDefinition {
  execute: ToolExecuteFn;
}

// ─── Default Configs ────────────────────────────────────────────────────────

export const DEFAULT_GUARDRAILS: GuardrailConfig = {
  maxActionsPerHour: 50,
  maxActionsPerDay: 500,
  maxCostPerAction: 0.50,
  maxDailyCost: 5.00,
  dollarThresholdForConfirmation: 100,
  forbiddenTools: [],
  blockedInputPatterns: [],
};

export const DEFAULT_MODE_PREFERENCES: Omit<AIModePreferences, "uid" | "createdAt" | "updatedAt"> = {
  globalMode: "ai_assist",
  featureModes: {},
  autonomyLevel: 1,
  autoRules: [],
  guardrails: DEFAULT_GUARDRAILS,
};
