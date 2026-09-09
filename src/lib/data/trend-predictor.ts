import { doc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp, where, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { AddTrendWatchlistInputSchema } from "./schemas";

export interface TrendWatchlistDoc {
  id: string;
  keyword: string;
  category: string;
  addedAt: Timestamp;
  lastChecked?: string;
  alertOnRising: boolean;
  alertOnPeak: boolean;
  alertOnSaturation: boolean;
}

export interface TrendAlertDoc {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  keyword?: string;
  category?: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface TrendPredictionDoc {
  id: string;
  productIdea: string;
  category: string;
  trendScore: number;
  confidence: string;
  direction: string;
  predictedPeak: string;
  timeToPeak: string;
  saturationRisk: number;
  competitionLevel: string;
  reasoning: string;
  relatedKeywords: string[];
  suggestedPlatforms: string[];
  estimatedMargin: number;
  createdAt: Timestamp;
}

export async function addTrendWatchlistEntry(uid: string, entry: Omit<TrendWatchlistDoc, "id" | "addedAt">): Promise<string | undefined> {
  try {
    const input = AddTrendWatchlistInputSchema.parse(entry);
    const ref = doc(collection(db, "users", uid, "trendWatchlist"));
    await setDoc(ref, { ...input, addedAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addTrendWatchlistEntry", error);
    return undefined;
  }
}

export async function getTrendWatchlist(uid: string): Promise<TrendWatchlistDoc[]> {
  try {
    const q = query(collection(db, "users", uid, "trendWatchlist"), orderBy("addedAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrendWatchlistDoc));
  } catch (error) {
    handleFirestoreError("getTrendWatchlist", error);
    return [];
  }
}

export async function deleteTrendWatchlistEntry(uid: string, entryId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "users", uid, "trendWatchlist", entryId));
    return true;
  } catch (error) {
    handleFirestoreError("deleteTrendWatchlistEntry", error);
    return false;
  }
}

export async function addTrendAlert(uid: string, alert: Omit<TrendAlertDoc, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "trendAlerts"));
    await setDoc(ref, { ...alert, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addTrendAlert", error);
    return undefined;
  }
}

export async function getTrendAlerts(uid: string, unreadOnly: boolean = false): Promise<TrendAlertDoc[]> {
  try {
    let q;
    if (unreadOnly) {
      q = query(
        collection(db, "users", uid, "trendAlerts"),
        where("read", "==", false),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    } else {
      q = query(collection(db, "users", uid, "trendAlerts"), orderBy("createdAt", "desc"), limit(50));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrendAlertDoc));
  } catch (error) {
    handleFirestoreError("getTrendAlerts", error);
    return [];
  }
}

export async function markTrendAlertRead(uid: string, alertId: string): Promise<boolean> {
  try {
    const ref = doc(db, "users", uid, "trendAlerts", alertId);
    await updateDoc(ref, { read: true });
    return true;
  } catch (error) {
    handleFirestoreError("markTrendAlertRead", error);
    return false;
  }
}

export async function addTrendPrediction(uid: string, prediction: Omit<TrendPredictionDoc, "id" | "createdAt">): Promise<string | undefined> {
  try {
    const ref = doc(collection(db, "users", uid, "trendPredictions"));
    await setDoc(ref, { ...prediction, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addTrendPrediction", error);
    return undefined;
  }
}

export async function getTrendPredictions(uid: string, limitCount: number = 20): Promise<TrendPredictionDoc[]> {
  try {
    const q = query(collection(db, "users", uid, "trendPredictions"), orderBy("createdAt", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrendPredictionDoc));
  } catch (error) {
    handleFirestoreError("getTrendPredictions", error);
    return [];
  }
}

export async function getTrendDashboard(uid: string): Promise<{
  activeTrends: number;
  risingStars: number;
  predictionsToday: number;
  alertsUnread: number;
}> {
  try {
    const [watchlist, predictions, alerts] = await Promise.all([
      getTrendWatchlist(uid),
      getTrendPredictions(uid, 100),
      getTrendAlerts(uid, true),
    ]);

    const today = new Date().toISOString().split("T")[0];
    const predictionsToday = predictions.filter((p) => {
      const created = p.createdAt?.toDate?.()?.toISOString?.()?.split("T")?.[0];
      return created === today;
    }).length;

    return {
      activeTrends: watchlist.length,
      risingStars: 0,
      predictionsToday,
      alertsUnread: alerts.length,
    };
  } catch (error) {
    handleFirestoreError("getTrendDashboard", error);
    return { activeTrends: 0, risingStars: 0, predictionsToday: 0, alertsUnread: 0 };
  }
}
