import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("chatHistory")
      .orderBy("timestamp", "asc")
      .limit(100)
      .get();

    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load chat history", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { role, content, provider } = body;

    if (!role || !content) {
      return NextResponse.json({ error: "role and content are required" }, { status: 400 });
    }

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("chatHistory").add({
      role,
      content,
      provider: provider || null,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save message", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const BATCH_SIZE = 500;
    let deleted = BATCH_SIZE;

    while (deleted === BATCH_SIZE) {
      const snap = await db
        .collection("users")
        .doc(uid)
        .collection("chatHistory")
        .limit(BATCH_SIZE)
        .get();

      deleted = snap.size;
      if (deleted === 0) break;

      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to clear history", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);
