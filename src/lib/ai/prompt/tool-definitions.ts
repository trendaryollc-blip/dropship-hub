import { ToolRegistry } from "../tools/registry";
import type { ToolDefinition } from "../types";

// ─── Tool Definitions for System Prompt ─────────────────────────────────────
// Generates tool schemas as text for LLM system prompts.
// This tells the LLM what tools are available and how to call them.

export function generateToolDefinitionsPrompt(): string {
  const tools = ToolRegistry.getAll();
  if (tools.length === 0) return "";

  const categories = ToolRegistry.getCategories();

  const sections = categories.map((cat) => {
    const catTools = tools.filter((t) => t.category === cat);
    return `### ${capitalize(cat)} Tools\n${catTools.map((t) => formatToolDefinition(t)).join("\n\n")}`;
  });

  return `## Available Tools

You have access to the following tools. Use them when the user's request requires executing actions, not just providing advice.

To call a tool, respond with a JSON block:
\`\`\`json
{
  "tool_calls": [
    {
      "tool": "tool_id",
      "input": { "param1": "value1", "param2": "value2" }
    }
  ]
}
\`\`\`

You can call multiple tools in sequence. After receiving results, provide a clear summary to the user.

### Tool Categories

${sections.join("\n\n")}

### Important Rules

1. Only call tools when the user explicitly asks to DO something, not for general questions
2. Always validate your tool inputs match the schema before calling
3. If a tool returns an error, explain what went wrong and suggest alternatives
4. For dangerous actions (place_order, push_to_store), the system may require user confirmation
5. Present tool results in a clear, readable format with markdown
6. If multiple tools are needed, call them in the correct dependency order`;
}

function formatToolDefinition(tool: ToolDefinition): string {
  const safetyEmoji = tool.safetyLevel === "safe" ? "🟢" : tool.safetyLevel === "moderate" ? "🟡" : "🔴";

  return `**${tool.id}** ${safetyEmoji} — ${tool.description}
  Category: ${tool.category}
  Input: JSON object (validate against the tool's schema)`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Compact tool list for quick reference ──────────────────────────────────

export function generateCompactToolList(): string {
  const tools = ToolRegistry.getAll();
  return tools.map((t) => {
    const safety = t.safetyLevel === "safe" ? "🟢" : t.safetyLevel === "moderate" ? "🟡" : "🔴";
    return `${safety} ${t.id}: ${t.description}`;
  }).join("\n");
}

// ─── Get tool schemas as JSON (for function calling APIs) ────────────────────

export function getToolSchemasAsJSON(): Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}> {
  return ToolRegistry.getAll().map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.id,
      description: tool.description,
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  }));
}
