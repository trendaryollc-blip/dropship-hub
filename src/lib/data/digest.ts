import { doc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { DigestEntrySchema, SaveDigestInputSchema } from "./schemas";

export interface DigestEntry {
  id: string;
  date: string;
  summary: string;
  metrics: {
    orders: number;
    revenue: number;
    profit: number;
    stockAlerts: number;
    supplierDelays: number;
  };
  alerts: {
    type: "stock" | "supplier" | "adSpend" | "trend";
    title: string;
    description: string;
    severity: "low" | "medium" | "high";
  }[];
  recommendations: string[];
  weeklyTrend?: {
    direction: "up" | "down" | "stable";
    percentage: number;
    insight: string;
  };
  generatedAt: Timestamp;
}

export async function saveDigest(uid: string, digest: Omit<DigestEntry, "id" | "generatedAt">) {
  try {
    const input = SaveDigestInputSchema.parse(digest);
    const ref = doc(collection(db, "users", uid, "digests"));
    await setDoc(ref, { ...input, generatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("saveDigest", error);
  }
}

export async function getDigests(uid: string, limitCount = 7): Promise<DigestEntry[]> {
  try {
    const q = query(
      collection(db, "users", uid, "digests"),
      orderBy("generatedAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...DigestEntrySchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getDigests", error);
  }
}

export async function getLatestDigest(uid: string): Promise<DigestEntry | null> {
  const digests = await getDigests(uid, 1);
  return digests.length > 0 ? digests[0] : null;
}

export async function deleteDigest(uid: string, digestId: string) {
  try {
    await deleteDoc(doc(db, "users", uid, "digests", digestId));
  } catch (error) {
    handleFirestoreError("deleteDigest", error);
  }
}
