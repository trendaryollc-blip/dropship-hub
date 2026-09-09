import { ToolRegistry } from "../tools/registry";
import type { AutonomyLevel, ToolSafetyLevel } from "../types";

// ─── Confirmation Logic ─────────────────────────────────────────────────────
// Determines whether a tool execution requires user confirmation based on:
// 1. Tool's safety level (safe/moderate/dangerous)
// 2. User's autonomy level (0-4)
// 3. Guardrail thresholds (dollar amounts, etc.)

interface ConfirmationDecision {
  required: boolean;
  reason: string;
  riskLevel: "low" | "medium" | "high";
}

export function needsConfirmation(
  toolId: string,
  input: Record<string, unknown>,
  autonomyLevel: AutonomyLevel,
  _dollarThreshold: number = 100
): ConfirmationDecision {
  const tool = ToolRegistry.get(toolId);
  if (!tool) {
    return { required: true, reason: "Unknown tool requires confirmation", riskLevel: "high" };
  }

  // Level 0: Advisory only — no execution happens, so this shouldn't be called
  if (autonomyLevel === 0) {
    return { required: true, reason: "Advisory mode — execution not enabled", riskLevel: "high" };
  }

  // Level 1: Always confirm everything
  if (autonomyLevel === 1) {
    return { required: true, reason: "Confirmation required (Ask Every Time mode)", riskLevel: getRiskLevel(tool.safetyLevel) };
  }

  // Level 2: Auto safe, confirm moderate + dangerous
  if (autonomyLevel === 2) {
    if (tool.safetyLevel === "safe") {
      return { required: false, reason: "Safe tool — auto-executing", riskLevel: "low" };
    }
    return { required: true, reason: `${tool.safetyLevel} tool requires confirmation`, riskLevel: getRiskLevel(tool.safetyLevel) };
  }

  // Level 3: Auto safe + moderate, confirm dangerous only
  if (autonomyLevel === 3) {
    if (tool.safetyLevel === "dangerous") {
      return { required: true, reason: "Dangerous tool requires confirmation", riskLevel: "high" };
    }
    return { required: false, reason: "Auto-executing non-dangerous tool", riskLevel: tool.safetyLevel === "safe" ? "low" : "medium" };
  }

  // Level 4: Full auto — but still confirm dangerous
  if (autonomyLevel === 4) {
    if (tool.safetyLevel === "dangerous") {
      return { required: true, reason: "Dangerous tool requires confirmation even in Full Auto", riskLevel: "high" };
    }
    return { required: false, reason: "Full auto — executing", riskLevel: "low" };
  }

  return { required: true, reason: "Unknown autonomy level", riskLevel: "high" };
}

export function checkDollarThreshold(
  input: Record<string, unknown>,
  threshold: number
): { exceeds: boolean; estimatedDollars: number } {
  const dollars = extractDollarAmount(input);
  return { exceeds: dollars > threshold, estimatedDollars: dollars };
}

function extractDollarAmount(input: Record<string, unknown>): number {
  const dollarKeys = ["cost", "price", "totalCost", "amount", "budget", "spend", "revenue", "profit", "orderTotal"];
  let maxDollar = 0;
  for (const key of dollarKeys) {
    const val = input[key];
    if (typeof val === "number" && val > maxDollar) {
      maxDollar = val;
    }
  }
  return maxDollar;
}

function getRiskLevel(safetyLevel: ToolSafetyLevel): "low" | "medium" | "high" {
  switch (safetyLevel) {
    case "safe": return "low";
    case "moderate": return "medium";
    case "dangerous": return "high";
  }
}

export function getConfirmationSummary(
  toolId: string,
  input: Record<string, unknown>
): { toolName: string; description: string; inputSummary: string } {
  const tool = ToolRegistry.get(toolId);
  return {
    toolName: tool?.name ?? toolId,
    description: tool?.description ?? "Execute action",
    inputSummary: summarizeInput(input),
  };
}

function summarizeInput(input: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.length > 100) {
      parts.push(`${key}: "${value.slice(0, 100)}..."`);
    } else if (typeof value === "object" && value !== null) {
      parts.push(`${key}: [object]`);
    } else {
      parts.push(`${key}: ${String(value)}`);
    }
  }
  return parts.join(", ");
}
