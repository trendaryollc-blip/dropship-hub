import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody } from "@/lib/validation";
import { z } from "zod";
import { executeWorkflow } from "@/lib/ai/workflows/runner";
import { getWorkflowTemplate, getWorkflowTemplates } from "@/lib/ai/workflows/templates";

// ─── POST /api/ai/workflows ──────────────────────────────────────────────────
// Execute a workflow or get workflow templates

const ExecuteWorkflowSchema = z.object({
  action: z.enum(["execute", "list", "get"]),
  workflowId: z.string().optional(),
  input: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const parseResult = validateBody(ExecuteWorkflowSchema, await request.json());
    if (!parseResult.success) return parseResult.response;
    const body = parseResult.data;

    if (body.action === "list") {
      const templates = getWorkflowTemplates();
      return NextResponse.json({
        success: true,
        workflows: templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          stepCount: t.steps.length,
        })),
      });
    }

    if (body.action === "get" && body.workflowId) {
      const template = getWorkflowTemplate(body.workflowId);
      if (!template) {
        return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, workflow: template });
    }

    if (body.action === "execute" && body.workflowId) {
      const template = getWorkflowTemplate(body.workflowId);
      if (!template) {
        return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
      }

      const result = await executeWorkflow(
        template,
        body.input || {},
        {
          uid,
          executionId: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          trigger: "ai_chat",
          mode: "ai_assist",
        }
      );

      return NextResponse.json({
        success: result.success,
        result,
        summary: result.summary,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, LIMITS.AI_CHAT);
