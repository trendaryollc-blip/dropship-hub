import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { createTemplate, getTemplate, getAllTemplates, updateTemplate, deleteTemplate, duplicateTemplate, executeTemplate, getBatch, getAllBatches, validateTemplate, getTemplateStats } from "@/lib/fulfillment/sample-templates";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";
    const templateId = searchParams.get("templateId");
    const batchId = searchParams.get("batchId");

    if (action === "list") {
      const templates = getAllTemplates();
      const stats = getTemplateStats();
      return NextResponse.json({ success: true, templates, stats });
    }

    if (action === "get" && templateId) {
      const template = getTemplate(templateId);
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, template });
    }

    if (action === "batch" && batchId) {
      const batch = getBatch(batchId);
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, batch });
    }

    if (action === "batches") {
      const limit = parseInt(searchParams.get("limit") || "20", 10);
      const batches = getAllBatches(limit);
      return NextResponse.json({ success: true, batches });
    }

    if (action === "stats") {
      const stats = getTemplateStats();
      return NextResponse.json({ success: true, stats });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch template data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { action, templateId, template: templateData, updates } = body;

    if (action === "create") {
      if (!templateData) {
        return NextResponse.json({ error: "template data is required" }, { status: 400 });
      }

      const validation = validateTemplate(templateData);
      if (!validation.valid) {
        return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
      }

      const template = createTemplate(templateData);
      return NextResponse.json({ success: true, template });
    }

    if (action === "update" && templateId) {
      if (!updates) {
        return NextResponse.json({ error: "updates data is required" }, { status: 400 });
      }

      const template = updateTemplate(templateId, updates);
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, template });
    }

    if (action === "delete" && templateId) {
      const deleted = deleteTemplate(templateId);
      if (!deleted) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Template deleted" });
    }

    if (action === "duplicate" && templateId) {
      const newName = body.newName || "Copy of Template";
      const template = duplicateTemplate(templateId, newName);
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, template });
    }

    if (action === "execute" && templateId) {
      const batch = await executeTemplate(templateId);
      return NextResponse.json({ success: true, batch });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process template request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 });
    }

    const deleted = deleteTemplate(templateId);
    if (!deleted) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Template deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete template", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
