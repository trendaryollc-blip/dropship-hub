import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { validateBody, KnowledgeBaseInputSchema } from "@/lib/validation";
import { addKnowledgeBaseEntry, getKnowledgeBaseEntries, deleteKnowledgeBaseEntry } from "@/lib/data/cs-enhanced";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;

    const entries = await getKnowledgeBaseEntries(uid, category);
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch knowledge base", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(KnowledgeBaseInputSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;
    const entryId = await addKnowledgeBaseEntry(uid, { ...data, usageCount: 0 });

    if (!entryId) {
      return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
    }

    return NextResponse.json({ id: entryId, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create knowledge base entry", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("id");
    if (!entryId) {
      return NextResponse.json({ error: "Missing entry ID" }, { status: 400 });
    }

    const success = await deleteKnowledgeBaseEntry(uid, entryId);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete entry", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
