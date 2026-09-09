import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import type { WebhookLogEntry } from "./types";

export async function logWebhookEvent(entry: Omit<WebhookLogEntry, "id" | "createdAt">): Promise<string> {
  try {
    const db = await getAdminDB();
    const docRef = await db.collection("users").doc(entry.uid).collection("webhookLogs").add({
      ...entry,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (err) {
    logger.error("Failed to log webhook event", { error: err instanceof Error ? err.message : String(err) });
    return "";
  }
}

export async function getWebhookLogs(
  uid: string,
  options: {
    direction?: "incoming" | "outgoing";
    webhookId?: string;
    event?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ logs: WebhookLogEntry[]; total: number }> {
  try {
    const db = await getAdminDB();
    let query: FirebaseFirestore.Query = db.collection("users").doc(uid).collection("webhookLogs");

    if (options.direction) {
      query = query.where("direction", "==", options.direction);
    }
    if (options.webhookId) {
      query = query.where("webhookId", "==", options.webhookId);
    }

    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    query = query.orderBy("createdAt", "desc");

    if (options.offset) {
      const offsetSnap = await query.limit(options.offset).get();
      const lastDoc = offsetSnap.docs[offsetSnap.docs.length - 1];
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
    }

    const limit = options.limit || 50;
    const snap = await query.limit(limit).get();

    const logs: WebhookLogEntry[] = snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    })) as WebhookLogEntry[];

    return { logs, total };
  } catch (err) {
    logger.error("Failed to get webhook logs", { uid, error: err instanceof Error ? err.message : String(err) });
    return { logs: [], total: 0 };
  }
}

export async function deleteOldWebhookLogs(uid: string, olderThanDays: number = 30): Promise<number> {
  try {
    const db = await getAdminDB();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const cutoffStr = cutoff.toISOString();

    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("webhookLogs")
      .where("createdAt", "<", cutoffStr)
      .limit(100)
      .get();

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    return snap.size;
  } catch (err) {
    logger.error("Failed to delete old webhook logs", { uid, error: err instanceof Error ? err.message : String(err) });
    return 0;
  }
}

export async function getWebhookLogStats(uid: string): Promise<{
  totalIncoming: number;
  totalOutgoing: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
}> {
  try {
    const db = await getAdminDB();
    const logsRef = db.collection("users").doc(uid).collection("webhookLogs");

    const [incomingSnap, outgoingSnap] = await Promise.all([
      logsRef.where("direction", "==", "incoming").count().get(),
      logsRef.where("direction", "==", "outgoing").count().get(),
    ]);

    const recentSnap = await logsRef.orderBy("createdAt", "desc").limit(100).get();
    const recentLogs = recentSnap.docs.map((doc) => doc.data() as WebhookLogEntry);

    const successCount = recentLogs.filter((l) => !l.error).length;
    const failureCount = recentLogs.filter((l) => !!l.error).length;
    const avgDuration = recentLogs.length > 0 ? recentLogs.reduce((sum, l) => sum + l.duration, 0) / recentLogs.length : 0;

    return {
      totalIncoming: incomingSnap.data().count,
      totalOutgoing: outgoingSnap.data().count,
      successCount,
      failureCount,
      avgDuration: Math.round(avgDuration),
    };
  } catch (err) {
    logger.error("Failed to get webhook log stats", { uid, error: err instanceof Error ? err.message : String(err) });
    return { totalIncoming: 0, totalOutgoing: 0, successCount: 0, failureCount: 0, avgDuration: 0 };
  }
}
