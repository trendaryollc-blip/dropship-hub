import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getAdminDB } from "@/lib/firebase-admin";
import { validateBody, CSTemplateInputSchema } from "@/lib/validation";
import { safeErrorMessage } from "@/lib/api-errors";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(CSTemplateInputSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("csTemplates").doc();
    await ref.set({
      name: data.name,
      category: data.category,
      subject: data.subject || data.name,
      body: data.body,
      variables: data.variables || [],
      usageCount: 0,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ id: ref.id, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create template", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");
    if (!templateId) {
      return NextResponse.json({ error: "Missing template ID" }, { status: 400 });
    }

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("csTemplates").doc(templateId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete template", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});
