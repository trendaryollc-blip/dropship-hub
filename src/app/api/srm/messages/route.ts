import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getSupplierMessages, addSupplierMessage, markMessageRead, deleteSupplierMessage } from "@/lib/data/srm";
import { getCJAccessToken } from "@/lib/cj-auth";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId") || undefined;

    const messages = await getSupplierMessages(uid, supplierId);
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch messages", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { supplierId, supplierName, subject, body: messageBody, messageType, relatedOrderId } = body;

    if (!supplierId || !supplierName || !subject || !messageBody) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Attempt to send via CJ API if supplier is CJ
    let cjMessageId: string | undefined;
    let status: "sent" | "failed" = "sent";

    if (supplierId === "cj-dropshipping") {
      try {
        const accessToken = await getCJAccessToken();
        const resp = await fetch("https://developers.cjdropshipping.com/api2.0/v1/message/send", {
          method: "POST",
          headers: { "CJ-Access-Token": accessToken, "Content-Type": "application/json" },
          body: JSON.stringify({ subject, content: messageBody, type: messageType }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await resp.json();
        if (data.result && data.data?.messageId) {
          cjMessageId = data.data.messageId;
        } else {
          status = "failed";
        }
      } catch {
        status = "failed";
      }
    }

    const messageId = await addSupplierMessage(uid, {
      supplierId,
      supplierName,
      direction: "outgoing",
      subject,
      body: messageBody,
      status,
      messageType: messageType || "general",
      relatedOrderId,
      cjMessageId,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: messageId, status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send message", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const PUT = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action, messageId } = body;

    if (action === "mark_read" && messageId) {
      await markMessageRead(uid, messageId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update message", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const messageId = req.nextUrl.searchParams.get("messageId");
    if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

    await deleteSupplierMessage(uid, messageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete message", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
