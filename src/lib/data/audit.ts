import { getAdminDB } from "@/lib/firebase-admin";
import { handleFirestoreError } from "./utils";
import type { AuditEntry, AuditAction, AuditFilter, AuditStats } from "@/types/business-health";

const COLLECTION = "auditLog";

export async function addAuditEntry(
  uid: string,
  entry: Omit<AuditEntry, "id" | "createdAt">
): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection(COLLECTION).doc();
    await ref.set({ ...entry, createdAt: new Date().toISOString() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addAuditEntry", error);
    return undefined;
  }
}

export async function getAuditEntries(
  uid: string,
  filter: AuditFilter = {}
): Promise<AuditEntry[]> {
  try {
    const db = await getAdminDB();
    const limit = Math.min(filter.limit || 50, 200);
    let query = db
      .collection("users").doc(uid).collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (filter.action) {
      query = query.where("action", "==", filter.action);
    }
    if (filter.entityType) {
      query = query.where("entityType", "==", filter.entityType);
    }
    if (filter.severity) {
      query = query.where("severity", "==", filter.severity);
    }

    const snap = await query.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AuditEntry[];
  } catch (error) {
    handleFirestoreError("getAuditEntries", error);
    return [];
  }
}

export async function getAuditStats(uid: string): Promise<AuditStats> {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users").doc(uid).collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();

    const entries = snap.docs.map((d) => d.data()) as AuditEntry[];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const todayEvents = entries.filter((e) => e.createdAt >= todayStart).length;
    const criticalEvents = entries.filter((e) => e.severity === "critical").length;

    // Top actions
    const actionCounts: Record<string, number> = {};
    entries.forEach((e) => { actionCounts[e.action] = (actionCounts[e.action] || 0) + 1; });
    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Activity timeline (last 7 days)
    const timeline: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      timeline[key] = 0;
    }
    entries.forEach((e) => {
      const dateKey = e.createdAt.split("T")[0];
      if (timeline[dateKey] !== undefined) {
        timeline[dateKey]++;
      }
    });
    const activityTimeline = Object.entries(timeline).map(([date, count]) => ({ date, count }));

    return {
      totalEvents: entries.length,
      todayEvents,
      criticalEvents,
      topActions,
      activityTimeline,
    };
  } catch (error) {
    handleFirestoreError("getAuditStats", error);
    return {
      totalEvents: 0,
      todayEvents: 0,
      criticalEvents: 0,
      topActions: [],
      activityTimeline: [],
    };
  }
}

export async function deleteAuditEntry(uid: string, entryId: string): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(COLLECTION).doc(entryId).delete();
    return true;
  } catch (error) {
    handleFirestoreError("deleteAuditEntry", error);
    return false;
  }
}
