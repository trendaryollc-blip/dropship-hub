import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

const COLLECTION = "orderNotes";

export const PATCH = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const parts = req.nextUrl.pathname.split("/");
    const noteId = parts[parts.length - 1];

    if (!noteId || noteId === "notes") {
      return NextResponse.json({ error: "noteId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection(COLLECTION).doc(noteId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const noteData = doc.data()!;
    if (noteData.isSystemGenerated) {
      return NextResponse.json({ error: "Cannot edit system-generated notes" }, { status: 400 });
    }

    const body = await req.json();
    const { content, isInternal } = body;

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (content !== undefined) updates.content = content;
    if (isInternal !== undefined) updates.isInternal = isInternal;

    await docRef.update(updates);

    const updated = await docRef.get();
    return NextResponse.json({ success: true, note: { id: updated.id, ...updated.data() } });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update note", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.ORDER_NOTES);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const parts = req.nextUrl.pathname.split("/");
    const noteId = parts[parts.length - 1];

    if (!noteId || noteId === "notes") {
      return NextResponse.json({ error: "noteId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = db.collection("users").doc(uid).collection(COLLECTION).doc(noteId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const noteData = doc.data()!;
    if (noteData.isSystemGenerated) {
      return NextResponse.json({ error: "Cannot delete system-generated notes" }, { status: 400 });
    }

    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete note", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.ORDER_NOTES);
