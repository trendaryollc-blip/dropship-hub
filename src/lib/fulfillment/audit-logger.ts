import type { AuditLogEntry, AuditAction } from "@/types/automation";
import { getAdminDB } from "@/lib/firebase-admin";

interface AuditContext {
  orderId: string;
  action: AuditAction;
  details: string;
  metadata?: Record<string, unknown>;
}

const COLLECTION = "auditLogs";
const MAX_ENTRIES = 1000;

async function getCollection(uid: string) {
  const db = await getAdminDB();
  return db.collection("users").doc(uid).collection(COLLECTION);
}

export async function logAuditEvent(uid: string, context: AuditContext): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orderId: context.orderId,
    action: context.action,
    details: context.details,
    metadata: context.metadata || {},
    timestamp: new Date().toISOString(),
  };

  try {
    const col = await getCollection(uid);
    await col.doc(entry.id).set(entry);

    // Enforce cap: delete oldest if over limit
    const countSnap = await col.count().get();
    const count = countSnap.data().count;
    if (count > MAX_ENTRIES) {
      const excess = count - MAX_ENTRIES;
      const oldDocs = await col.orderBy("timestamp", "asc").limit(excess).get();
      const batch = (await getAdminDB()).batch();
      oldDocs.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch (error) {
    console.error("[audit-logger] Failed to persist to Firestore:", error);
  }

  return entry;
}

export async function getAuditLogs(
  uid: string,
  options?: {
    orderId?: string;
    action?: AuditAction;
    limit?: number;
    offset?: number;
  }
): Promise<AuditLogEntry[]> {
  try {
    const col = await getCollection(uid);
    let query: FirebaseFirestore.Query = col.orderBy("timestamp", "desc");

    if (options?.orderId) {
      query = query.where("orderId", "==", options.orderId);
    }
    if (options?.action) {
      query = query.where("action", "==", options.action);
    }

    const offset = options?.offset || 0;
    const limit = options?.limit || 50;

    // Firestore doesn't support offset natively; use startAfter for pagination
    if (offset > 0) {
      const anchorSnap = await col.orderBy("timestamp", "desc").limit(offset).get();
      const lastDoc = anchorSnap.docs[anchorSnap.docs.length - 1];
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
    }

    const snap = await query.limit(limit).get();
    return snap.docs.map((d) => d.data() as AuditLogEntry);
  } catch (error) {
    console.error("[audit-logger] Failed to read from Firestore:", error);
    return [];
  }
}

export async function getAuditLogCount(uid: string, orderId?: string): Promise<number> {
  try {
    const col = await getCollection(uid);
    if (orderId) {
      const snap = await col.where("orderId", "==", orderId).count().get();
      return snap.data().count;
    }
    const snap = await col.count().get();
    return snap.data().count;
  } catch (error) {
    console.error("[audit-logger] Failed to count:", error);
    return 0;
  }
}

export async function clearAuditLogs(uid: string, orderId?: string): Promise<number> {
  try {
    const col = await getCollection(uid);
    if (orderId) {
      const snap = await col.where("orderId", "==", orderId).get();
      const batch = (await getAdminDB()).batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      return snap.size;
    }
    const snap = await col.get();
    const batch = (await getAdminDB()).batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snap.size;
  } catch (error) {
    console.error("[audit-logger] Failed to clear:", error);
    return 0;
  }
}

export async function getAuditStats(uid: string): Promise<{
  totalEvents: number;
  eventsByAction: Record<string, number>;
  recentErrors: AuditLogEntry[];
  ordersProcessed: number;
}> {
  try {
    const col = await getCollection(uid);
    const snap = await col.orderBy("timestamp", "desc").limit(1000).get();
    const logs = snap.docs.map((d) => d.data() as AuditLogEntry);

    const eventsByAction: Record<string, number> = {};
    const errorActions = new Set(["order_failed", "sla_breach", "profit_rejected", "inventory_unavailable"]);

    for (const log of logs) {
      eventsByAction[log.action] = (eventsByAction[log.action] || 0) + 1;
    }

    const recentErrors = logs.filter((l) => errorActions.has(l.action)).slice(0, 10);
    const orderIds = new Set(logs.map((l) => l.orderId));

    return {
      totalEvents: logs.length,
      eventsByAction,
      recentErrors,
      ordersProcessed: orderIds.size,
    };
  } catch (error) {
    console.error("[audit-logger] Failed to get stats:", error);
    return { totalEvents: 0, eventsByAction: {}, recentErrors: [], ordersProcessed: 0 };
  }
}
