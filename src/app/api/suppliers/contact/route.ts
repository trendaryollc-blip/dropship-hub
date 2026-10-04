import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/api-errors";
import { smartSendEmail } from "@/lib/email/smart-sender";

interface ContactFormData {
  supplierId: string;
  supplierName: string;
  name: string;
  email: string;
  company?: string;
  quantity?: string;
  subject: string;
  message: string;
  contactEmail?: string;
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body: ContactFormData = await request.json();

    // Validate required fields
    if (!body.supplierId || !body.supplierName || !body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { error: "Missing required fields: supplierId, supplierName, name, email, subject, and message are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Store inquiry in Firestore
    const db = await getAdminDB();
    // Resolve the supplier's email: explicit contactEmail, else the stored
    // supplier record's contactEmail, else none.
    let supplierEmail = (body.contactEmail ?? "").trim();
    if (!supplierEmail) {
      try {
        const supSnap = await db.collection("suppliers").doc(body.supplierId).get();
        supplierEmail = (supSnap.data()?.contactEmail as string | undefined) ?? "";
      } catch {
        supplierEmail = "";
      }
    }

    const inquiryRef = await db.collection("supplier-inquiries").add({
      uid,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      name: body.name,
      email: body.email,
      company: body.company || "",
      quantity: body.quantity || "",
      subject: body.subject,
      message: body.message,
      supplierEmail,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    let delivery: "sent" | "logged" | "failed" = "logged";
    let deliveryError: string | undefined;

    if (supplierEmail) {
      const send = await smartSendEmail({
        to: supplierEmail,
        replyTo: body.email,
        subject: `[DropShipHub] ${body.subject}`,
        html: `<p><b>From:</b> ${body.name} &lt;${body.email}&gt;${body.company ? ` — ${body.company}` : ""}${body.quantity ? `<br/><b>Quantity:</b> ${body.quantity}` : ""}</p><p><b>Subject:</b> ${body.subject}</p><p>${body.message.replace(/\n/g, "<br/>")}</p>`,
        tags: [{ name: "inquiryId", value: inquiryRef.id }],
      });
      if (send.success) {
        delivery = "sent";
        await inquiryRef.update({ status: "sent", deliveryProvider: send.provider, updatedAt: new Date().toISOString() });
      } else {
        delivery = "failed";
        deliveryError = send.error;
        await inquiryRef.update({ status: "failed", lastError: send.error, updatedAt: new Date().toISOString() });
      }
    }

    return NextResponse.json({
      success: true,
      inquiryId: inquiryRef.id,
      message:
        delivery === "sent"
          ? "Inquiry sent to the supplier."
          : delivery === "failed"
            ? `Inquiry saved, but email delivery failed: ${deliveryError}`
            : "Inquiry saved to your records (no supplier email on file — add contactEmail to delivery it).",
      delivery,
      ...(deliveryError ? { deliveryError } : {}),
    });
  } catch (error) {
    console.error("Failed to submit supplier inquiry:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
