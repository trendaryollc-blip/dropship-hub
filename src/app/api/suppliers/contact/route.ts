import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

interface ContactFormData {
  supplierId: string;
  supplierName: string;
  name: string;
  email: string;
  company?: string;
  quantity?: string;
  subject: string;
  message: string;
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
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      inquiryId: inquiryRef.id,
      message: "Your inquiry has been sent successfully",
    });
  } catch (error) {
    console.error("Failed to submit supplier inquiry:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
