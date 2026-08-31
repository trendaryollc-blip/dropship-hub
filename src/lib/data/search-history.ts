import { doc, setDoc, collection, query, orderBy, limit, startAfter, getDocs, writeBatch, serverTimestamp, Timestamp, type QueryConstraint } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { SearchHistoryEntrySchema, CompetitorSearchEntrySchema, AddSearchHistoryInputSchema, AddCompetitorSearchInputSchema } from "./schemas";

export interface SearchHistoryEntry {
  id: string;
  query: string;
  source: string;
  resultCount?: number;
  createdAt: Timestamp;
}

export async function addSearchHistory(uid: string, entry: Omit<SearchHistoryEntry, "id" | "createdAt">) {
  try {
    const input = AddSearchHistoryInputSchema.parse(entry);
    const ref = doc(collection(db, "users", uid, "searchHistory"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addSearchHistory", error);
  }
}

export async function getSearchHistory(uid: string, limitCount = 20): Promise<SearchHistoryEntry[]> {
  try {
    const q = query(
      collection(db, "users", uid, "searchHistory"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...SearchHistoryEntrySchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getSearchHistory", error);
  }
}

export async function clearSearchHistory(uid: string) {
  try {
    const MAX_ITERATIONS = 100;
    let iteration = 0;
    let lastDoc = null;
    while (iteration < MAX_ITERATIONS) {
      iteration++;
      const constraints: QueryConstraint[] = [limit(50)];
      if (lastDoc) constraints.push(startAfter(lastDoc));
      const q = query(collection(db, "users", uid, "searchHistory"), ...constraints);
      const snap = await getDocs(q);
      if (snap.empty) break;
      const batch = writeBatch(db);
      for (const docSnap of snap.docs) {
        batch.delete(docSnap.ref);
      }
      await batch.commit();
      lastDoc = snap.docs[snap.docs.length - 1];
    }
  } catch (error) {
    handleFirestoreError("clearSearchHistory", error);
  }
}

export interface CompetitorSearchEntry {
  id: string;
  query: string;
  platformsFound: number;
  totalListings: number;
  avgPrice: number;
  createdAt: Timestamp;
}

export async function addCompetitorSearch(uid: string, entry: Omit<CompetitorSearchEntry, "id" | "createdAt">) {
  try {
    const input = AddCompetitorSearchInputSchema.parse(entry);
    const ref = doc(collection(db, "users", uid, "competitorSearches"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addCompetitorSearch", error);
  }
}

export async function getCompetitorSearches(uid: string, limitCount = 20): Promise<CompetitorSearchEntry[]> {
  try {
    const q = query(
      collection(db, "users", uid, "competitorSearches"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...CompetitorSearchEntrySchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getCompetitorSearches", error);
  }
}
