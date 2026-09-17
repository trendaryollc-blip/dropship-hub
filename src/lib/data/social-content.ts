import { getAdminDB } from "@/lib/firebase-admin";
import { handleFirestoreError } from "./utils";
import type { SocialContentDoc, ContentCalendarEntry, ContentStats, SocialPlatform, ContentType } from "@/types/social-content";

const CONTENT_COLLECTION = "socialContent";
const CALENDAR_COLLECTION = "contentCalendar";

export async function addSocialContent(uid: string, entry: Omit<SocialContentDoc, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection(CONTENT_COLLECTION).doc();
    await ref.set({ ...entry, createdAt: new Date().toISOString() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addSocialContent", error);
    return undefined;
  }
}

export async function getSocialContent(uid: string, maxResults = 50): Promise<SocialContentDoc[]> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection(CONTENT_COLLECTION)
      .orderBy("createdAt", "desc").limit(maxResults).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SocialContentDoc[];
  } catch (error) {
    handleFirestoreError("getSocialContent", error);
    return [];
  }
}

export async function deleteSocialContent(uid: string, contentId: string): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(CONTENT_COLLECTION).doc(contentId).delete();
    return true;
  } catch (error) {
    handleFirestoreError("deleteSocialContent", error);
    return false;
  }
}

export async function addCalendarEntry(uid: string, entry: Omit<ContentCalendarEntry, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection(CALENDAR_COLLECTION).doc();
    await ref.set({ ...entry, createdAt: new Date().toISOString() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addCalendarEntry", error);
    return undefined;
  }
}

export async function getCalendarEntries(uid: string, maxResults = 30): Promise<ContentCalendarEntry[]> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection(CALENDAR_COLLECTION)
      .orderBy("date", "desc").limit(maxResults).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ContentCalendarEntry[];
  } catch (error) {
    handleFirestoreError("getCalendarEntries", error);
    return [];
  }
}

export async function updateCalendarEntry(uid: string, entryId: string, updates: Partial<ContentCalendarEntry>): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(CALENDAR_COLLECTION).doc(entryId).update(updates);
    return true;
  } catch (error) {
    handleFirestoreError("updateCalendarEntry", error);
    return false;
  }
}

export async function deleteCalendarEntry(uid: string, entryId: string): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(CALENDAR_COLLECTION).doc(entryId).delete();
    return true;
  } catch (error) {
    handleFirestoreError("deleteCalendarEntry", error);
    return false;
  }
}

export async function getContentStats(uid: string): Promise<ContentStats> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection(CONTENT_COLLECTION)
      .orderBy("createdAt", "desc").limit(200).get();
    const docs = snap.docs.map((d) => d.data()) as SocialContentDoc[];

    const platformBreakdown: Record<SocialPlatform, number> = {
      tiktok: 0, instagram_reels: 0, youtube_shorts: 0, facebook_reels: 0, pinterest_pins: 0,
    };
    const contentTypeBreakdown: Record<ContentType, number> = {
      hook: 0, caption: 0, script: 0, hashtag_set: 0, ad_copy: 0, ugc_script: 0, story: 0, carousel: 0,
    };

    docs.forEach((d) => {
      platformBreakdown[d.platform]++;
      contentTypeBreakdown[d.contentType]++;
    });

    const topPlatform = Object.entries(platformBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] as SocialPlatform || "tiktok";
    const calendarSnap = await db.collection("users").doc(uid).collection(CALENDAR_COLLECTION).get();

    return {
      totalGenerated: docs.length,
      totalSaved: docs.filter((d) => d.saved).length,
      platformBreakdown,
      contentTypeBreakdown,
      topPerformingPlatform: topPlatform,
      avgEngagementRate: 0,
      calendarEntries: calendarSnap.size,
      scheduledPosts: calendarSnap.docs.filter((d) => d.data().status === "scheduled").length,
    };
  } catch (error) {
    handleFirestoreError("getContentStats", error);
    return {
      totalGenerated: 0, totalSaved: 0,
      platformBreakdown: { tiktok: 0, instagram_reels: 0, youtube_shorts: 0, facebook_reels: 0, pinterest_pins: 0 },
      contentTypeBreakdown: { hook: 0, caption: 0, script: 0, hashtag_set: 0, ad_copy: 0, ugc_script: 0, story: 0, carousel: 0 },
      topPerformingPlatform: "tiktok", avgEngagementRate: 0, calendarEntries: 0, scheduledPosts: 0,
    };
  }
}
