import { doc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, where, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { AdCreativeSchema, AddAdCreativeInputSchema } from "./schemas";

export interface AdCreative {
  id: string;
  campaignId: string;
  platform: "facebook" | "google";
  type: "headline" | "description" | "body" | "cta";
  content: string;
  aiProvider: string;
  performance?: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    conversionRate: number;
  };
  createdAt: Timestamp;
}

export async function addAdCreative(uid: string, creative: Omit<AdCreative, "id" | "createdAt">) {
  try {
    const input = AddAdCreativeInputSchema.parse(creative);
    const ref = doc(collection(db, "users", uid, "adCreatives"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addAdCreative", error);
  }
}

export async function getAdCreatives(uid: string, limitCount = 50): Promise<AdCreative[]> {
  try {
    const q = query(collection(db, "users", uid, "adCreatives"), orderBy("createdAt", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...AdCreativeSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getAdCreatives", error);
  }
}

export async function getAdCreativesByCampaign(uid: string, campaignId: string): Promise<AdCreative[]> {
  try {
    const q = query(collection(db, "users", uid, "adCreatives"), where("campaignId", "==", campaignId), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...AdCreativeSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getAdCreativesByCampaign", error);
  }
}

export async function getAdCreativeById(uid: string, creativeId: string): Promise<AdCreative | null> {
  try {
    const { getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "users", uid, "adCreatives", creativeId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...AdCreativeSchema.parse(snap.data()) };
  } catch (error) {
    handleFirestoreError("getAdCreativeById", error);
  }
}

export async function deleteAdCreative(uid: string, creativeId: string) {
  try {
    await deleteDoc(doc(db, "users", uid, "adCreatives", creativeId));
  } catch (error) {
    handleFirestoreError("deleteAdCreative", error);
  }
}
