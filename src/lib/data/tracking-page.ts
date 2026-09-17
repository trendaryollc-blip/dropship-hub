import { getAdminDB } from "@/lib/firebase-admin";
import { handleFirestoreError } from "./utils";
import type { TrackingPageConfigDoc, TrackingPageStats, TrackingPageView } from "@/types/tracking-page";

const COLLECTION = "trackingPageConfigs";
const VIEWS_COLLECTION = "trackingPageViews";

export async function saveTrackingPageConfig(uid: string, config: Omit<TrackingPageConfigDoc, "id" | "createdAt" | "updatedAt">): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection(COLLECTION).doc(config.storeId);
    const now = new Date().toISOString();
    await ref.set({ ...config, id: ref.id, createdAt: now, updatedAt: now }, { merge: true });
    return ref.id;
  } catch (error) {
    handleFirestoreError("saveTrackingPageConfig", error);
    return undefined;
  }
}

export async function getTrackingPageConfigs(uid: string): Promise<TrackingPageConfigDoc[]> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection(COLLECTION).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TrackingPageConfigDoc[];
  } catch (error) {
    handleFirestoreError("getTrackingPageConfigs", error);
    return [];
  }
}

export async function deleteTrackingPageConfig(uid: string, configId: string): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(COLLECTION).doc(configId).delete();
    return true;
  } catch (error) {
    handleFirestoreError("deleteTrackingPageConfig", error);
    return false;
  }
}

export async function addTrackingPageView(uid: string, view: Omit<TrackingPageView, "id">): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection(VIEWS_COLLECTION).doc();
    await ref.set({ ...view, id: ref.id });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addTrackingPageView", error);
    return undefined;
  }
}

export async function getTrackingPageStats(uid: string): Promise<TrackingPageStats> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection(VIEWS_COLLECTION)
      .orderBy("viewedAt", "desc").limit(500).get();
    const views = snap.docs.map((d) => d.data()) as TrackingPageView[];

    const total = views.length;
    const uniqueEmails = new Set(views.map((v) => v.customerEmail));
    const avgDuration = total > 0 ? views.reduce((s, v) => s + v.duration, 0) / total : 0;

    const upsellClicks = views.filter((v) => v.upsellClicked).length;
    const upsellConversions = views.filter((v) => v.upsellConverted).length;

    // Country breakdown
    const countryMap: Record<string, number> = {};
    views.forEach((v) => { countryMap[v.country] = (countryMap[v.country] || 0) + 1; });
    const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([country, views]) => ({ country, views }));

    // Device breakdown
    const deviceMap: Record<string, number> = {};
    views.forEach((v) => { deviceMap[v.device] = (deviceMap[v.device] || 0) + 1; });
    const deviceBreakdown = Object.entries(deviceMap).map(([device, count]) => ({ device, count }));

    return {
      totalViews: total,
      uniqueVisitors: uniqueEmails.size,
      avgDuration: Math.round(avgDuration),
      upsellClickRate: total > 0 ? Math.round((upsellClicks / total) * 100) : 0,
      upsellConversionRate: upsellClicks > 0 ? Math.round((upsellConversions / upsellClicks) * 100) : 0,
      totalUpsellRevenue: 0,
      supportTicketReduction: Math.round(total * 0.35),
      topCountries,
      deviceBreakdown,
      recentViews: views.slice(0, 10),
    };
  } catch (error) {
    handleFirestoreError("getTrackingPageStats", error);
    return {
      totalViews: 0, uniqueVisitors: 0, avgDuration: 0,
      upsellClickRate: 0, upsellConversionRate: 0, totalUpsellRevenue: 0,
      supportTicketReduction: 0, topCountries: [], deviceBreakdown: [], recentViews: [],
    };
  }
}
