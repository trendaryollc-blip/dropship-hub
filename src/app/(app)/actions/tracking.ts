"use server";

import { getAdminDB } from "@/lib/firebase-admin";

export async function trackSearchEvent(event: string, data: Record<string, unknown>) {
  try {
    const db = await getAdminDB();
    await db.collection("searchTracking").add({
      event,
      ...data,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // silently ignore tracking failures
  }
}
