import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { DocumentData } from "firebase-admin/firestore";

interface DigestPreferences {
  autoGenerate: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  preferredTime: string;
  emailAddress: string;
}

const defaultPreferences: DigestPreferences = {
  autoGenerate: false,
  emailEnabled: false,
  pushEnabled: false,
  preferredTime: "09:00",
  emailAddress: "",
};

export const GET = withAuth(async (_request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userDoc = await db.collection("users").doc(uid).get();
    const data = userDoc.data() as DocumentData | undefined;
    const preferences = data?.digestPreferences || defaultPreferences;
    return NextResponse.json({ preferences });
  } catch {
    return NextResponse.json({ preferences: defaultPreferences });
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const db = await getAdminDB();
    await db.collection("users").doc(uid).set(
      { digestPreferences: body },
      { merge: true }
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
});
