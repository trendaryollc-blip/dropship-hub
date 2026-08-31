import { doc, setDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { CalcHistoryEntrySchema, SaveCalcHistoryInputSchema } from "./schemas";

export interface CalcHistoryEntry {
  id: string;
  type: "profit" | "shipping" | "landed" | "margin" | "adroi";
  inputs: Record<string, number>;
  result: Record<string, number>;
  savedAt: Timestamp;
}

export async function saveCalcHistory(uid: string, entry: Omit<CalcHistoryEntry, "id" | "savedAt">) {
  try {
    const input = SaveCalcHistoryInputSchema.parse(entry);
    const ref = doc(collection(db, "users", uid, "calcHistory"));
    await setDoc(ref, { ...input, savedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("saveCalcHistory", error);
  }
}

export async function getCalcHistory(uid: string, type?: CalcHistoryEntry["type"]): Promise<CalcHistoryEntry[]> {
  try {
    let q;
    if (type) {
      q = query(
        collection(db, "users", uid, "calcHistory"),
        where("type", "==", type),
        orderBy("savedAt", "desc"),
        limit(20)
      );
    } else {
      q = query(
        collection(db, "users", uid, "calcHistory"),
        orderBy("savedAt", "desc"),
        limit(20)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...CalcHistoryEntrySchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getCalcHistory", error);
  }
}
