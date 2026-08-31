import { doc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { CostProfileEntrySchema, ProfitEntryDocSchema, AddCostProfileInputSchema, AddProfitEntryInputSchema } from "./schemas";

export interface CostProfileEntry {
  id: string;
  productId: string;
  productTitle: string;
  cogs: number;
  shippingCost: number;
  platformFeePercent: number;
  paymentProcessingPercent: number;
  packagingCost: number;
  otherCosts: number;
  createdAt: Timestamp;
}

export async function addCostProfile(uid: string, entry: Omit<CostProfileEntry, "id" | "createdAt">) {
  try {
    const input = AddCostProfileInputSchema.parse(entry);
    const ref = doc(collection(db, "users", uid, "costProfiles"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addCostProfile", error);
  }
}

export async function getCostProfiles(uid: string): Promise<CostProfileEntry[]> {
  try {
    const q = query(collection(db, "users", uid, "costProfiles"), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...CostProfileEntrySchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getCostProfiles", error);
  }
}

export async function deleteCostProfile(uid: string, profileId: string) {
  try {
    await deleteDoc(doc(db, "users", uid, "costProfiles", profileId));
  } catch (error) {
    handleFirestoreError("deleteCostProfile", error);
  }
}

export interface ProfitEntryDoc {
  id: string;
  orderId: string;
  date: string;
  productTitle: string;
  platform: string;
  revenue: number;
  cogs: number;
  shippingCost: number;
  platformFee: number;
  paymentProcessing: number;
  refunds: number;
  adSpend: number;
  netProfit: number;
  profitMargin: number;
  createdAt: Timestamp;
}

export async function addProfitEntry(uid: string, entry: Omit<ProfitEntryDoc, "id" | "createdAt">) {
  try {
    const input = AddProfitEntryInputSchema.parse(entry);
    const ref = doc(collection(db, "users", uid, "profitEntries"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addProfitEntry", error);
  }
}

export async function getProfitEntries(uid: string, limitCount = 50): Promise<ProfitEntryDoc[]> {
  try {
    const q = query(collection(db, "users", uid, "profitEntries"), orderBy("createdAt", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...ProfitEntryDocSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getProfitEntries", error);
  }
}
