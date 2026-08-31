import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { LIMITS } from "@/lib/rate-limit";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { title, price, image, url, source } = await request.json();
    
    if (!title || !url) {
      return NextResponse.json({ error: "Title and URL are required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const docRef = await db.collection("users").doc(uid).collection("savedProducts").add({
      title,
      price: price || null,
      image: image || null,
      url,
      source: source || "chrome-extension",
      savedAt: new Date().toISOString(),
      tags: [],
      notes: "",
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
