import { getAdminDB } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import type { RepriceAuditEntry } from "./types";

export async function logRepriceAction(
  uid: string,
  entry: Omit<RepriceAuditEntry, "id" | "createdAt">
): Promise<string> {
  try {
    const db = await getAdminDB();
    const auditRef = db.collection("users").doc(uid).collection("repriceAudit").doc();

    const fullEntry: RepriceAuditEntry = {
      ...entry,
      id: auditRef.id,
      createdAt: new Date().toISOString(),
    };

    await auditRef.set(fullEntry);
    return auditRef.id;
  } catch (err) {
    logger.error("Failed to log reprice action", { uid, error: err instanceof Error ? err.message : String(err) });
    return "";
  }
}

export async function getRepriceAuditLog(
  uid: string,
  limit = 50
): Promise<RepriceAuditEntry[]> {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("repriceAudit")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) => d.data() as RepriceAuditEntry);
  } catch (err) {
    logger.error("Failed to get reprice audit log", { uid, error: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

export async function getRepriceStats(uid: string): Promise<{
  totalReprices: number;
  successfulReprices: number;
  failedReprices: number;
  avgPriceChange: number;
  lastRepriceTime: string | null;
}> {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("repriceAudit")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    if (snap.empty) {
      return { totalReprices: 0, successfulReprices: 0, failedReprices: 0, avgPriceChange: 0, lastRepriceTime: null };
    }

    const entries = snap.docs.map((d) => d.data() as RepriceAuditEntry);
    const successful = entries.filter((e) => !e.error);
    const failed = entries.filter((e) => !!e.error);

    let totalChange = 0;
    for (const e of entries) {
      if (e.oldSellPrice > 0) {
        totalChange += ((e.newSellPrice - e.oldSellPrice) / e.oldSellPrice) * 100;
      }
    }

    return {
      totalReprices: entries.length,
      successfulReprices: successful.length,
      failedReprices: failed.length,
      avgPriceChange: entries.length > 0 ? Math.round((totalChange / entries.length) * 100) / 100 : 0,
      lastRepriceTime: entries[0]?.createdAt || null,
    };
  } catch (err) {
    logger.error("Failed to get reprice stats", { uid, error: err instanceof Error ? err.message : String(err) });
    return { totalReprices: 0, successfulReprices: 0, failedReprices: 0, avgPriceChange: 0, lastRepriceTime: null };
  }
}
