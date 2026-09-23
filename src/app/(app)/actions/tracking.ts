"use server";

import { getAdminDB, getAdminAuth } from "@/lib/firebase-admin";

export async function trackSearchEvent(
  event: string,
  data: Record<string, unknown>,
  idToken: string
) {
  try {
    // Never trust a client-supplied userId — derive the identity from the
    // verified ID token instead.
    const adminAuth = getAdminAuth();
    if (!adminAuth) return;
    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return;
    }

    const db = await getAdminDB();
    await db.collection("searchTracking").add({
      event,
      ...data,
      userId: uid,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // silently ignore tracking failures
  }
}