import { getAdminDB } from "@/lib/firebase-admin";
import { handleFirestoreError } from "./utils";
import type { CashFlowEntry } from "@/types/cash-flow";

const ENTRIES_COLLECTION = "cashFlowEntries";
const SETTINGS_COLLECTION = "cashFlowSettings";

export interface CashFlowSettings {
  startingBalance: number;
}

export async function getCashFlowSettings(uid: string): Promise<CashFlowSettings> {
  try {
    const db = await getAdminDB();
    const doc = await db.collection("users").doc(uid).collection(SETTINGS_COLLECTION).doc("main").get();
    const data = doc.data();
    const balance = typeof data?.startingBalance === "number" && Number.isFinite(data.startingBalance)
      ? data.startingBalance
      : 0;
    return { startingBalance: balance };
  } catch (error) {
    handleFirestoreError("getCashFlowSettings", error);
    return { startingBalance: 0 };
  }
}

export async function saveCashFlowSettings(uid: string, settings: CashFlowSettings): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(SETTINGS_COLLECTION).doc("main").set(
      { startingBalance: settings.startingBalance, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return true;
  } catch (error) {
    handleFirestoreError("saveCashFlowSettings", error);
    return false;
  }
}

export async function getCashFlowEntries(uid: string, maxResults = 100): Promise<CashFlowEntry[]> {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users").doc(uid).collection(ENTRIES_COLLECTION)
      .orderBy("expectedDate", "asc")
      .limit(maxResults)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CashFlowEntry[];
  } catch (error) {
    handleFirestoreError("getCashFlowEntries", error);
    return [];
  }
}

export async function addCashFlowEntry(
  uid: string,
  entry: Omit<CashFlowEntry, "id" | "createdAt">
): Promise<string | undefined> {
  try {
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection(ENTRIES_COLLECTION).doc();
    await ref.set({ ...entry, createdAt: new Date().toISOString() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addCashFlowEntry", error);
    return undefined;
  }
}

export async function updateCashFlowEntry(
  uid: string,
  entryId: string,
  updates: Partial<Omit<CashFlowEntry, "id" | "createdAt">>
): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(ENTRIES_COLLECTION).doc(entryId).update(updates);
    return true;
  } catch (error) {
    handleFirestoreError("updateCashFlowEntry", error);
    return false;
  }
}

export async function deleteCashFlowEntry(uid: string, entryId: string): Promise<boolean> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection(ENTRIES_COLLECTION).doc(entryId).delete();
    return true;
  } catch (error) {
    handleFirestoreError("deleteCashFlowEntry", error);
    return false;
  }
}
