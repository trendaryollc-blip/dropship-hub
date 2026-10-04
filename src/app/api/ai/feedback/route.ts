import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";

/**
 * Store a thumbs up/down rating against a chat message so we can audit
 * response quality. Written as an append-only feedback event.
 */
export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { messageId, feedback } = body;

    if (!messageId || (feedback !== "up" && feedback !== "down")) {
      return NextResponse.json({ error: "messageId and feedback ('up'|'down') are required" }, { status: 400 });
    }

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("aiFeedback").add({
      messageId,
      feedback,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save feedback", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);
