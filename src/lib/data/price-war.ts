import { doc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, getDoc, serverTimestamp, Timestamp, where, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { AddPriceRuleInputSchema, AddPriceAdjustmentLogInputSchema } from "./schemas";

export interface PriceRuleDoc {
  id: string;
  productTitle: string;
  productImage?: string;
  productUrl?: string;
  myPrice: number;
  cost: number;
  floorPrice: number;
  minMargin: number;
  strategy: string;
  strategyConfig: Record<string, number | undefined>;
  platforms: string[];
  competitorUrls: string[];
  status: string;
  lastChecked?: string;
  lastAdjusted?: string;
  createdAt: Timestamp;
}

export interface PriceAdjustmentLogDoc {
  id: string;
  ruleId: string;
  productTitle: string;
  previousPrice: number;
  newPrice: number;
  reason: string;
  strategy: string;
  competitorPrice?: number;
  marginBefore: number;
  marginAfter: number;
  autoApplied: boolean;
  createdAt: Timestamp;
}

export async function addPriceRule(uid: string, rule: Omit<PriceRuleDoc, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const input = AddPriceRuleInputSchema.parse(rule);
    const ref = doc(collection(db, "users", uid, "priceRules"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addPriceRule", error);
    return undefined;
  }
}

export async function getPriceRules(uid: string, status?: string): Promise<PriceRuleDoc[]> {
  try {
    let q;
    if (status) {
      q = query(
        collection(db, "users", uid, "priceRules"),
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    } else {
      q = query(collection(db, "users", uid, "priceRules"), orderBy("createdAt", "desc"), limit(50));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PriceRuleDoc));
  } catch (error) {
    handleFirestoreError("getPriceRules", error);
    return [];
  }
}

export async function updatePriceRule(uid: string, ruleId: string, updates: Partial<PriceRuleDoc>): Promise<boolean> {
  try {
    const ref = doc(db, "users", uid, "priceRules", ruleId);
    await updateDoc(ref, updates);
    return true;
  } catch (error) {
    handleFirestoreError("updatePriceRule", error);
    return false;
  }
}

export async function deletePriceRule(uid: string, ruleId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "users", uid, "priceRules", ruleId));
    return true;
  } catch (error) {
    handleFirestoreError("deletePriceRule", error);
    return false;
  }
}

export async function addPriceAdjustmentLog(uid: string, log: Omit<PriceAdjustmentLogDoc, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const input = AddPriceAdjustmentLogInputSchema.parse(log);
    const ref = doc(collection(db, "users", uid, "priceAdjustmentLogs"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addPriceAdjustmentLog", error);
    return undefined;
  }
}

export async function getPriceAdjustmentLogs(uid: string, ruleId?: string, limitCount: number = 50): Promise<PriceAdjustmentLogDoc[]> {
  try {
    let q;
    if (ruleId) {
      q = query(
        collection(db, "users", uid, "priceAdjustmentLogs"),
        where("ruleId", "==", ruleId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
    } else {
      q = query(collection(db, "users", uid, "priceAdjustmentLogs"), orderBy("createdAt", "desc"), limit(limitCount));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PriceAdjustmentLogDoc));
  } catch (error) {
    handleFirestoreError("getPriceAdjustmentLogs", error);
    return [];
  }
}

export async function getPriceWarStats(uid: string): Promise<{
  totalRules: number;
  activeRules: number;
  pausedRules: number;
  triggeredToday: number;
  totalAdjustments: number;
  avgMarginMaintained: number;
  totalSavingsFromAdjustments: number;
  lastFullScan?: string;
}> {
  try {
    const rules = await getPriceRules(uid);
    const logs = await getPriceAdjustmentLogs(uid, undefined, 200);
    const today = new Date().toISOString().split("T")[0];

    const activeRules = rules.filter((r) => r.status === "active").length;
    const pausedRules = rules.filter((r) => r.status === "paused").length;
    const triggeredToday = logs.filter((l) => {
      const ts = l.createdAt?.toDate?.();
      return ts ? ts.toISOString().startsWith(today) : false;
    }).length;
    const avgMargin = rules.length > 0
      ? rules.reduce((sum, r) => sum + (r.myPrice > 0 ? ((r.myPrice - r.cost) / r.myPrice) * 100 : 0), 0) / rules.length
      : 0;

    const totalSavingsFromAdjustments = logs.reduce((sum, log) => {
      if (log.newPrice < log.previousPrice) {
        return sum + (log.previousPrice - log.newPrice);
      }
      return sum;
    }, 0);

    const lastCheckedDates = rules
      .map((r) => r.lastChecked)
      .filter((lc): lc is string => !!lc)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return {
      totalRules: rules.length,
      activeRules,
      pausedRules,
      triggeredToday,
      totalAdjustments: logs.length,
      avgMarginMaintained: Math.round(avgMargin * 10) / 10,
      totalSavingsFromAdjustments: Math.round(totalSavingsFromAdjustments * 100) / 100,
      lastFullScan: lastCheckedDates[0],
    };
  } catch (error) {
    handleFirestoreError("getPriceWarStats", error);
    return { totalRules: 0, activeRules: 0, pausedRules: 0, triggeredToday: 0, totalAdjustments: 0, avgMarginMaintained: 0, totalSavingsFromAdjustments: 0 };
  }
}

export interface PriceWarSettings {
  enabled: boolean;
  checkIntervalMinutes: number;
  autoApply: boolean;
  maxDailyAdjustments: number;
  notifyOnAdjustment: boolean;
  notifyOnFloorBreach: boolean;
}

const DEFAULT_PRICE_WAR_SETTINGS: PriceWarSettings = {
  enabled: true,
  checkIntervalMinutes: 60,
  autoApply: true,
  maxDailyAdjustments: 50,
  notifyOnAdjustment: true,
  notifyOnFloorBreach: true,
};

export async function getPriceWarSettings(uid: string): Promise<PriceWarSettings> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "priceWarSettings", "config"));
    if (snap.exists()) {
      return { ...DEFAULT_PRICE_WAR_SETTINGS, ...(snap.data() as Partial<PriceWarSettings>) };
    }
    return DEFAULT_PRICE_WAR_SETTINGS;
  } catch (error) {
    handleFirestoreError("getPriceWarSettings", error);
    return DEFAULT_PRICE_WAR_SETTINGS;
  }
}

export interface PendingAdjustmentDoc {
  id: string;
  ruleId: string;
  productTitle: string;
  previousPrice: number;
  suggestedPrice: number;
  reason: string;
  strategy: string;
  competitorPrice?: number;
  marginBefore: number;
  marginAfter: number;
  expiresAt: string;
  createdAt: Timestamp;
}

export async function addPendingAdjustment(uid: string, adjustment: Omit<PendingAdjustmentDoc, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "pricePendingAdjustments"));
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await setDoc(ref, { ...adjustment, expiresAt, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addPendingAdjustment", error);
    return undefined;
  }
}

export async function getPendingAdjustments(uid: string): Promise<PendingAdjustmentDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "pricePendingAdjustments"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PendingAdjustmentDoc));
  } catch (error) {
    handleFirestoreError("getPendingAdjustments", error);
    return [];
  }
}

export async function approvePendingAdjustments(uid: string, adjustmentIds: string[]): Promise<number> {
  try {
    const batch = writeBatch(db);
    let count = 0;
    for (const id of adjustmentIds) {
      batch.delete(doc(db, "users", uid, "pricePendingAdjustments", id));
      count++;
    }
    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError("approvePendingAdjustments", error);
    return 0;
  }
}

export async function cleanupExpiredPendingAdjustments(uid: string): Promise<number> {
  try {
    const pending = await getPendingAdjustments(uid);
    const now = new Date();
    const expired = pending.filter((p) => {
      const expires = new Date(p.expiresAt);
      return expires < now;
    });

    if (expired.length === 0) return 0;

    const batch = writeBatch(db);
    for (const adj of expired) {
      batch.delete(doc(db, "users", uid, "pricePendingAdjustments", adj.id));
    }
    await batch.commit();
    return expired.length;
  } catch (error) {
    handleFirestoreError("cleanupExpiredPendingAdjustments", error);
    return 0;
  }
}

export interface PriceSnapshotDoc {
  id: string;
  ruleId: string;
  myPrice: number;
  lowestCompetitorPrice?: number;
  competitorPrices: Array<{ url: string; price: number; seller: string }>;
  createdAt: Timestamp;
}

export async function addPriceSnapshot(uid: string, snapshot: Omit<PriceSnapshotDoc, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "priceSnapshots"));
    await setDoc(ref, { ...snapshot, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addPriceSnapshot", error);
    return undefined;
  }
}

export async function getPriceSnapshots(uid: string, ruleId: string, days: number = 30): Promise<PriceSnapshotDoc[]> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, "users", uid, "priceSnapshots"),
      where("ruleId", "==", ruleId),
      where("createdAt", ">=", since),
      orderBy("createdAt", "asc"),
      limit(500)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PriceSnapshotDoc));
  } catch (error) {
    handleFirestoreError("getPriceSnapshots", error);
    return [];
  }
}

export interface PriceAlertDoc {
  id: string;
  ruleId: string;
  type: "price_drop" | "price_increase" | "out_of_stock" | "new_competitor" | "below_floor";
  message: string;
  competitorPrice: number;
  myPrice: number;
  severity: "low" | "medium" | "high";
  read: boolean;
  createdAt: Timestamp;
}

export async function addPriceAlert(uid: string, alert: Omit<PriceAlertDoc, "id" | "createdAt" | "read">): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "priceAlerts"));
    await setDoc(ref, { ...alert, read: false, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addPriceAlert", error);
    return undefined;
  }
}

export async function getPriceAlerts(uid: string, unreadOnly: boolean = false): Promise<PriceAlertDoc[]> {
  try {
    let q;
    if (unreadOnly) {
      q = query(
        collection(db, "users", uid, "priceAlerts"),
        where("read", "==", false),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    } else {
      q = query(
        collection(db, "users", uid, "priceAlerts"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PriceAlertDoc));
  } catch (error) {
    handleFirestoreError("getPriceAlerts", error);
    return [];
  }
}

export async function markAlertsRead(uid: string, alertIds?: string[]): Promise<boolean> {
  try {
    if (alertIds && alertIds.length > 0) {
      const batch = writeBatch(db);
      for (const id of alertIds) {
        batch.update(doc(db, "users", uid, "priceAlerts", id), { read: true });
      }
      await batch.commit();
    }
    return true;
  } catch (error) {
    handleFirestoreError("markAlertsRead", error);
    return false;
  }
}

export async function getUnreadAlertCount(uid: string): Promise<number> {
  try {
    const q = query(
      collection(db, "users", uid, "priceAlerts"),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (error) {
    handleFirestoreError("getUnreadAlertCount", error);
    return 0;
  }
}
