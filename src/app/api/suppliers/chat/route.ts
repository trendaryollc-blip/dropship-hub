import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    if (supplierId) {
      const messagesSnap = await db
        .collection("users")
        .doc(uid)
        .collection("supplierMessages")
        .where("supplierId", "==", supplierId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      const messages = messagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ messages });
    }

    const conversationsSnap = await db
      .collection("users")
      .doc(uid)
      .collection("supplierConversations")
      .orderBy("lastMessageAt", "desc")
      .limit(20)
      .get();

    const conversations = conversationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const body = await request.json();

    const { supplierId, supplierName, subject, body: messageBody } = body;
    if (!supplierId || !messageBody) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let conversationRef;
    const existingConvo = await db
      .collection("users")
      .doc(uid)
      .collection("supplierConversations")
      .where("supplierId", "==", supplierId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!existingConvo.empty) {
      conversationRef = existingConvo.docs[0].ref;
    } else {
      conversationRef = db
        .collection("users")
        .doc(uid)
        .collection("supplierConversations")
        .doc();

      await conversationRef.set({
        id: conversationRef.id,
        supplierId,
        supplierName: supplierName || "Unknown",
        subject: subject || "General Inquiry",
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        status: "active",
      });
    }

    const messageRef = db
      .collection("users")
      .doc(uid)
      .collection("supplierMessages")
      .doc();

    const message = {
      id: messageRef.id,
      conversationId: conversationRef.id,
      supplierId,
      direction: "outgoing",
      subject,
      body: messageBody,
      status: "sent",
      timestamp: new Date().toISOString(),
    };

    await messageRef.set(message);
    await conversationRef.update({
      lastMessageAt: new Date().toISOString(),
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
