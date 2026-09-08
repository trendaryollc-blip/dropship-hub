import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ToolExecuteFn,
  ToolRegistration,
  ToolCategory,
  ToolSafetyLevel,
} from "../types";

// ─── Tool Registry ──────────────────────────────────────────────────────────
// Central registry for all AI-executable tools. Tools are registered at
// startup and looked up by ID during execution.

class ToolRegistryImpl {
  private tools = new Map<string, ToolRegistration>();

  register(tool: ToolRegistration): void {
    if (this.tools.has(tool.id)) {
      console.warn(`[ToolRegistry] Overwriting existing tool: ${tool.id}`);
    }
    this.tools.set(tool.id, tool);
  }

  registerMany(tools: ToolRegistration[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  get(id: string): ToolRegistration | undefined {
    return this.tools.get(id);
  }

  getAll(): ToolRegistration[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: ToolCategory): ToolRegistration[] {
    return this.getAll().filter((t) => t.category === category);
  }

  getDefinitions(): ToolDefinition[] {
    return this.getAll().map(({ execute, ...def }) => def);
  }

  getDefinitionsForCategory(category: ToolCategory): ToolDefinition[] {
    return this.getByCategory(category).map(({ execute, ...def }) => def);
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  getSafeToolIds(): string[] {
    return this.getAll()
      .filter((t) => t.safetyLevel === "safe")
      .map((t) => t.id);
  }

  getToolIdsBySafety(level: ToolSafetyLevel): string[] {
    return this.getAll()
      .filter((t) => t.safetyLevel === level)
      .map((t) => t.id);
  }

  getCategories(): ToolCategory[] {
    const cats = new Set<ToolCategory>();
    for (const tool of this.tools.values()) {
      cats.add(tool.category);
    }
    return Array.from(cats);
  }

  async executeTool(
    toolId: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return {
        success: false,
        data: null,
        summary: `Tool not found: ${toolId}`,
        error: `Unknown tool: ${toolId}`,
      };
    }

    const validation = tool.inputSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        data: null,
        summary: `Invalid input for ${tool.name}: ${validation.error.message}`,
        error: validation.error.message,
      };
    }

    try {
      return await tool.execute(validation.data as Record<string, unknown>, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        data: null,
        summary: `Tool ${tool.name} failed: ${message}`,
        error: message,
      };
    }
  }
}

// Singleton
export const ToolRegistry = new ToolRegistryImpl();

// ─── Helper: Create a tool registration ─────────────────────────────────────

export function createTool(config: {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  safetyLevel: ToolSafetyLevel;
  inputSchema: ToolDefinition["inputSchema"];
  estimatedCost?: ToolDefinition["estimatedCost"];
  execute: ToolExecuteFn;
}): ToolRegistration {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    category: config.category,
    safetyLevel: config.safetyLevel,
    inputSchema: config.inputSchema,
    estimatedCost: config.estimatedCost,
    execute: config.execute,
  };
}
