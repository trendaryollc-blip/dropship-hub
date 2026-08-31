import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";

    const db = await getAdminDB();

    if (type === "conversations") {
      const snap = await db.collection("users").doc(uid).collection("csConversations").orderBy("createdAt", "desc").limit(50).get();
      const conversations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ conversations });
    }

    if (type === "messages") {
      const convId = searchParams.get("conversationId");
      if (!convId) return NextResponse.json({ messages: [] });
      const snap = await db.collection("users").doc(uid).collection("csMessages").orderBy("createdAt", "asc").limit(100).get();
      const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentData & { id: string })).filter((m) => m.conversationId === convId);
      return NextResponse.json({ messages });
    }

    if (type === "templates") {
      const snap = await db.collection("users").doc(uid).collection("csTemplates").orderBy("createdAt", "desc").limit(20).get();
      const templates = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ templates });
    }

    if (type === "escalations") {
      const snap = await db.collection("users").doc(uid).collection("csConversations").where("status", "==", "escalated").orderBy("createdAt", "desc").limit(20).get();
      const escalations = snap.docs.map((d) => {
        const data = d.data() as DocumentData;
        return {
          id: `esc-${d.id}`,
          conversationId: d.id,
          customerName: (data.customerName as string) || "",
          reason: "manual_escalation",
          reasonDetail: (data.lastMessage as string) || "",
          confidence: 0,
          customerMessage: (data.lastMessage as string) || "",
          status: "pending",
          createdAt: (data.createdAt as string) || new Date().toISOString(),
        };
      });
      return NextResponse.json({ escalations });
    }

    // Default: overview
    const convSnap = await db.collection("users").doc(uid).collection("csConversations").get();
    const conversations = convSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentData & { id: string }));

    const activeConversations = conversations.filter((c) => c.status === "active").length;
    const escalatedQueue = conversations.filter((c) => c.status === "escalated").length;
    const resolvedToday = conversations.filter((c) => c.status === "resolved").length;
    const totalHandled = conversations.length;
    const aiHandledCount = conversations.filter((c) => c.aiHandled).length;

    const stats = {
      activeConversations,
      escalatedQueue,
      resolvedToday,
      avgConfidence: 0,
      resolutionRate: totalHandled > 0 ? +((resolvedToday / totalHandled) * 100).toFixed(1) : 0,
      avgResponseTime: "< 30s",
      totalHandled,
      aiHandledPercent: totalHandled > 0 ? +((aiHandledCount / totalHandled) * 100).toFixed(0) : 0,
    };

    return NextResponse.json({ stats, conversations });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch CS data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { message, conversationId } = body;

    const db = await getAdminDB();

    // Save the user message
    if (conversationId && message) {
      await db.collection("users").doc(uid).collection("csMessages").add({
        conversationId,
        role: "customer",
        content: message,
        createdAt: new Date().toISOString(),
      });
    }

    // Simple AI response logic (keyword matching)
    const lower = (message || "").toLowerCase();
    let response = "Thank you for reaching out! I'm here to help. Could you tell me more about what you need?";
    let confidence = 85;
    let shouldEscalate = false;

    if (lower.includes("where") || lower.includes("track")) {
      response = "I'd be happy to help you track your order! Could you please provide your order number?";
      confidence = 95;
    } else if (lower.includes("refund")) {
      response = "I understand you'd like a refund. Our policy allows returns within 30 days. Could you share your order number?";
      confidence = 92;
    } else if (lower.includes("broken") || lower.includes("defective")) {
      response = "I'm sorry about the issue. We offer a full replacement or refund. Which would you prefer?";
      confidence = 78;
      shouldEscalate = true;
    } else if (lower.includes("frustrat") || lower.includes("angry")) {
      response = "I sincerely apologize for the inconvenience. I'm connecting you with a human agent for personalized help.";
      confidence = 60;
      shouldEscalate = true;
    }

    // Save AI response
    if (conversationId) {
      await db.collection("users").doc(uid).collection("csMessages").add({
        conversationId,
        role: "ai",
        content: response,
        confidence,
        escalated: shouldEscalate,
        createdAt: new Date().toISOString(),
      });

      // Update conversation last message
      await db.collection("users").doc(uid).collection("csConversations").doc(conversationId).update({
        lastMessage: message,
        messageCount: (body.messageCount || 0) + 1,
      });
    }

    return NextResponse.json({
      message: {
        id: `msg-${Date.now()}`,
        conversationId: conversationId || "new",
        role: "ai",
        content: response,
        confidence,
        timestamp: new Date().toISOString(),
        escalated: shouldEscalate,
      },
      response,
      confidence,
      shouldEscalate,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process message", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
