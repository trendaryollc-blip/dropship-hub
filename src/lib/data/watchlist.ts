import { doc, setDoc, deleteDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { WatchlistEntrySchema, AddWatchlistInputSchema } from "./schemas";

export interface WatchlistEntry {
  id: string;
  type: "product" | "niche" | "competitor";
  title: string;
  itemId: string;
  currentPrice?: number;
  targetPrice?: number;
  notes?: string;
  addedAt: Timestamp;
}

export async function addToWatchlist(uid: string, entry: Omit<WatchlistEntry, "id" | "addedAt">) {
  try {
    const input = AddWatchlistInputSchema.parse(entry);
    const favId = `${input.type}_${input.itemId}`;
    await setDoc(doc(db, "users", uid, "watchlist", favId), {
      ...input,
      addedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError("addToWatchlist", error);
  }
}

export async function removeFromWatchlist(uid: string, type: WatchlistEntry["type"], itemId: string) {
  try {
    const favId = `${type}_${itemId}`;
    await deleteDoc(doc(db, "users", uid, "watchlist", favId));
  } catch (error) {
    handleFirestoreError("removeFromWatchlist", error);
  }
}

export async function getWatchlist(uid: string, type?: WatchlistEntry["type"]): Promise<WatchlistEntry[]> {
  try {
    let q;
    if (type) {
      q = query(
        collection(db, "users", uid, "watchlist"),
        where("type", "==", type),
        orderBy("addedAt", "desc"),
        limit(50)
      );
    } else {
      q = query(
        collection(db, "users", uid, "watchlist"),
        orderBy("addedAt", "desc"),
        limit(50)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...WatchlistEntrySchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getWatchlist", error);
  }
}
