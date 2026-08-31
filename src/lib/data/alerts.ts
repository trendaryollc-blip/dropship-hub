import { doc, setDoc, updateDoc, collection, query, where, orderBy, limit, startAfter, getDocs, writeBatch, serverTimestamp, Timestamp, type QueryConstraint } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { AlertEntrySchema, AddAlertInputSchema } from "./schemas";

export interface AlertEntry {
  id: string;
  type: "opportunity" | "risk" | "info" | "warning";
  title: string;
  description: string;
  action?: string;
  actionHref?: string;
  read: boolean;
  confidence?: number;
  aiAnalysis?: string;
  createdAt: Timestamp;
}

export async function addAlert(uid: string, alert: Omit<AlertEntry, "id" | "createdAt">) {
  try {
    const input = AddAlertInputSchema.parse(alert);
    const ref = doc(collection(db, "users", uid, "alerts"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addAlert", error);
  }
}

export async function getAlerts(uid: string, limitCount = 20): Promise<AlertEntry[]> {
  try {
    const q = query(
      collection(db, "users", uid, "alerts"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...AlertEntrySchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getAlerts", error);
  }
}

export async function markAlertRead(uid: string, alertId: string) {
  try {
    await updateDoc(doc(db, "users", uid, "alerts", alertId), { read: true });
  } catch (error) {
    handleFirestoreError("markAlertRead", error);
  }
}

export async function markAllAlertsRead(uid: string) {
  try {
    const MAX_ITERATIONS = 100;
    let iteration = 0;
    let lastDoc = null;
    while (iteration < MAX_ITERATIONS) {
      iteration++;
      const constraints: QueryConstraint[] = [where("read", "==", false), limit(50)];
      if (lastDoc) constraints.push(startAfter(lastDoc));
      const q = query(collection(db, "users", uid, "alerts"), ...constraints);
      const snap = await getDocs(q);
      if (snap.empty) break;
      const batch = writeBatch(db);
      for (const docSnap of snap.docs) {
        batch.update(docSnap.ref, { read: true });
      }
      await batch.commit();
      lastDoc = snap.docs[snap.docs.length - 1];
    }
  } catch (error) {
    handleFirestoreError("markAllAlertsRead", error);
  }
}
