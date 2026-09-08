import { generateToolDefinitionsPrompt } from "./tool-definitions";
import type { AIModePreferences, ExecutionMode } from "../types";

// ─── Enhanced System Prompt ─────────────────────────────────────────────────
// Builds the enhanced system prompt that includes tool awareness
// and mode-aware instructions.

interface PromptConfig {
  basePrompt: string;
  modePreferences?: AIModePreferences;
  includeTools?: boolean;
}

export function buildEnhancedPrompt(config: PromptConfig): string {
  const parts: string[] = [config.basePrompt];

  // Add tool definitions if tools are registered and mode allows execution
  if (config.includeTools !== false) {
    const mode = config.modePreferences?.globalMode ?? "ai_assist";
    if (mode !== "manual") {
      const toolDefs = generateToolDefinitionsPrompt();
      if (toolDefs) {
        parts.push(toolDefs);
        parts.push(getModeInstructions(mode));
      }
    }
  }

  return parts.join("\n\n");
}

function getModeInstructions(mode: ExecutionMode): string {
  switch (mode) {
    case "manual":
      return `## Mode: Manual
The user prefers to execute actions manually. Do NOT call any tools. Only provide advice and recommendations.`;

    case "ai_assist":
      return `## Mode: AI Assist
You CAN execute tools when the user asks you to DO something. The user expects you to take action.

### When to call tools:
- User says "find", "search", "compare", "calculate", "optimize" → call the relevant tool
- User says "save", "update", "push", "send" → call the relevant tool
- User says "show me", "get", "what's" → call the relevant tool for data

### When NOT to call tools:
- User asks "what is", "how do", "explain" → provide text advice only
- User asks for opinion or recommendation → provide analysis, optionally suggest tools
- Simple greetings or conversation → respond naturally

### Response format:
1. If you need to call tools, output the tool_calls JSON block
2. After receiving tool results, present them clearly with markdown
3. Always explain what you did and what the results mean
4. Suggest next steps`;

    case "auto":
      return `## Mode: Auto
The user has enabled auto mode. You should proactively execute tools when appropriate.

### Proactive execution:
- If the user's business data shows issues (e.g., low margin, competitor price drop), suggest AND execute relevant tools
- If you identify an optimization opportunity, execute the optimization tool
- Always explain what you're doing before and after execution

### Safety:
- Still require confirmation for dangerous actions
- Log all actions for audit trail
- Present results with full analysis`;

    default:
      return "";
  }
}

// ─── Build prompt with tool results context ─────────────────────────────────

export function buildToolResultsContext(
  toolResults: Array<{ toolId: string; summary: string; success: boolean }>
): string {
  if (toolResults.length === 0) return "";

  const lines = toolResults.map((r) => {
    const status = r.success ? "✅" : "❌";
    return `${status} ${r.toolId}: ${r.summary}`;
  });

  return `\n\n## Previous Tool Execution Results\n${lines.join("\n")}`;
}

// ─── Build mode-aware response instructions ─────────────────────────────────

export function buildResponseInstructions(
  hasToolResults: boolean,
  pendingConfirmations: number
): string {
  const parts: string[] = [];

  if (hasToolResults) {
    parts.push("You have tool execution results. Present them clearly:");
    parts.push("- Use markdown tables for comparisons");
    parts.push("- Use bullet points for lists");
    parts.push("- Highlight key metrics (profit, margin, cost)");
    parts.push("- Always include a clear summary");
    parts.push("- Suggest specific next steps");
  }

  if (pendingConfirmations > 0) {
    parts.push(`There are ${pendingConfirmations} actions awaiting user confirmation.`);
    parts.push("Inform the user about pending actions and ask them to confirm or cancel.");
  }

  return parts.join("\n");
}
