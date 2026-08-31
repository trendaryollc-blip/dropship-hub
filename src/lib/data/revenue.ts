import { doc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { RevenueEntrySchema, AddRevenueEntryInputSchema } from "./schemas";

export interface RevenueEntry {
  id: string;
  date: string;
  amount: number;
  orders: number;
  productTitle?: string;
  platform?: string;
  profit?: number;
  createdAt: Timestamp;
}

export async function addRevenueEntry(uid: string, entry: Omit<RevenueEntry, "id" | "createdAt">) {
  try {
    const input = AddRevenueEntryInputSchema.parse(entry);
    const ref = doc(collection(db, "users", uid, "revenue"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addRevenueEntry", error);
  }
}

export async function getRevenueEntries(uid: string, limitCount = 30): Promise<RevenueEntry[]> {
  try {
    const q = query(
      collection(db, "users", uid, "revenue"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...RevenueEntrySchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getRevenueEntries", error);
  }
}

export async function deleteRevenueEntry(uid: string, entryId: string) {
  try {
    await deleteDoc(doc(db, "users", uid, "revenue", entryId));
  } catch (error) {
    handleFirestoreError("deleteRevenueEntry", error);
  }
}
