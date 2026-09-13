import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import type { OrderNote } from "@/types/fulfillment";

const COLLECTION = "orderNotes";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const orderId = req.nextUrl.searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const snapshot = await db
      .collection("users").doc(uid).collection(COLLECTION)
      .where("orderId", "==", orderId)
      .orderBy("createdAt", "desc")
      .get();

    const notes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as OrderNote[];

    return NextResponse.json({ notes, total: notes.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch notes", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.ORDER_NOTES);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { orderId, content, isInternal } = body;

    if (!orderId || !content) {
      return NextResponse.json(
        { error: "orderId and content are required" },
        { status: 400 }
      );
    }

    const db = await getAdminDB();
    const now = new Date().toISOString();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);

    const note: OrderNote = {
      id,
      orderId,
      uid,
      author: "You",
      content,
      isInternal: isInternal === true,
      isSystemGenerated: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("users").doc(uid).collection(COLLECTION).doc(id).set(note);

    return NextResponse.json({ success: true, note });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create note", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.ORDER_NOTES);
