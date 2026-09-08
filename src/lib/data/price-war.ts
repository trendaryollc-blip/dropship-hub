import { doc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp, where, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { PriceRuleSchema, AddPriceRuleInputSchema, AddPriceAdjustmentLogInputSchema } from "./schemas";

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
  lastFullScan?: string;
}> {
  try {
    const rules = await getPriceRules(uid);
    const logs = await getPriceAdjustmentLogs(uid, undefined, 100);
    const today = new Date().toISOString().split("T")[0];

    const activeRules = rules.filter((r) => r.status === "active").length;
    const pausedRules = rules.filter((r) => r.status === "paused").length;
    const triggeredToday = logs.filter((l) => l.createdAt?.toDate?.()?.toISOString?.()?.startsWith(today)).length;
    const avgMargin = rules.length > 0
      ? rules.reduce((sum, r) => sum + (r.myPrice > 0 ? ((r.myPrice - r.cost) / r.myPrice) * 100 : 0), 0) / rules.length
      : 0;

    return {
      totalRules: rules.length,
      activeRules,
      pausedRules,
      triggeredToday,
      totalAdjustments: logs.length,
      avgMarginMaintained: Math.round(avgMargin * 10) / 10,
      lastFullScan: rules[0]?.lastChecked,
    };
  } catch (error) {
    handleFirestoreError("getPriceWarStats", error);
    return { totalRules: 0, activeRules: 0, pausedRules: 0, triggeredToday: 0, totalAdjustments: 0, avgMarginMaintained: 0 };
  }
}
