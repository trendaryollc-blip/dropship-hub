import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";
import { withAuth } from "@/lib/auth";
import { safeErrorMessage } from "@/lib/api-errors";

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
          confidence: null,
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

    const msgSnap = await db
      .collection("users")
      .doc(uid)
      .collection("csMessages")
      .orderBy("createdAt", "asc")
      .limit(200)
      .get();
    const messages = msgSnap.docs.map((d) => d.data() as DocumentData);

    const storedConfidences = messages
      .map((m) => m.confidence)
      .filter((c): c is number => typeof c === "number" && Number.isFinite(c));
    const avgConfidence =
      storedConfidences.length > 0
        ? +(storedConfidences.reduce((sum, c) => sum + c, 0) / storedConfidences.length).toFixed(1)
        : null;

    const replyDeltas: number[] = [];
    const pendingCustomerAt: Record<string, number> = {};
    for (const m of messages) {
      const at = Date.parse(String(m.createdAt ?? ""));
      if (!Number.isFinite(at)) continue;
      const convId = String(m.conversationId ?? "");
      if (m.role === "customer") {
        pendingCustomerAt[convId] = at;
      } else if (m.role === "ai" && convId && pendingCustomerAt[convId] !== undefined) {
        const delta = at - pendingCustomerAt[convId];
        if (delta >= 0) replyDeltas.push(delta);
        delete pendingCustomerAt[convId];
      }
    }
    const avgReplyMs =
      replyDeltas.length > 0 ? replyDeltas.reduce((sum, d) => sum + d, 0) / replyDeltas.length : null;
    const avgResponseTime =
      avgReplyMs === null
        ? null
        : avgReplyMs < 60000
          ? `${Math.max(1, Math.round(avgReplyMs / 1000))}s`
          : `${Math.round(avgReplyMs / 60000)}m`;

    const stats = {
      activeConversations,
      escalatedQueue,
      resolvedToday,
      avgConfidence,
      resolutionRate: totalHandled > 0 ? +((resolvedToday / totalHandled) * 100).toFixed(1) : 0,
      avgResponseTime,
      totalHandled,
      aiHandledPercent: totalHandled > 0 ? +((aiHandledCount / totalHandled) * 100).toFixed(0) : 0,
    };

    return NextResponse.json({ stats, conversations });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch CS data", details: safeErrorMessage(error, "Unknown error") },
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

    // Rule-based response logic (keyword matching)
    const lower = (message || "").toLowerCase();
    let response = "Thank you for reaching out! I'm here to help. Could you tell me more about what you need?";
    let matchedRule = "General reply";
    let shouldEscalate = false;

    if (lower.includes("where") || lower.includes("track")) {
      response = "I'd be happy to help you track your order! Could you please provide your order number?";
      matchedRule = "Order tracking";
    } else if (lower.includes("refund")) {
      response = "I understand you'd like a refund. Our policy allows returns within 30 days. Could you share your order number?";
      matchedRule = "Refund policy";
    } else if (lower.includes("broken") || lower.includes("defective")) {
      response = "I'm sorry about the issue. We offer a full replacement or refund. Which would you prefer?";
      matchedRule = "Defect or damage";
      shouldEscalate = true;
    } else if (lower.includes("frustrat") || lower.includes("angry")) {
      response = "I sincerely apologize for the inconvenience. I'm connecting you with a human agent for personalized help.";
      matchedRule = "Frustration detected";
      shouldEscalate = true;
    }

    // Save rule-based response
    if (conversationId) {
      await db.collection("users").doc(uid).collection("csMessages").add({
        conversationId,
        role: "ai",
        content: response,
        matchedRule,
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
        matchedRule,
        confidence: null,
        timestamp: new Date().toISOString(),
        escalated: shouldEscalate,
      },
      response,
      matchedRule,
      confidence: null,
      shouldEscalate,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process message", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
});
