import { doc, setDoc, deleteDoc, updateDoc, collection, query, orderBy, limit, getDocs, where, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { AdCampaignSchema, AddAdCampaignInputSchema } from "./schemas";

export interface AdCampaign {
  id: string;
  platformCampaignId?: string;
  platform: "facebook" | "google" | "manual";
  name: string;
  status: "active" | "paused" | "completed" | "draft";
  productTitle: string;
  productId?: string;
  dailyBudget: number;
  totalBudget?: number;
  targeting?: {
    locations?: string[];
    ageMin?: number;
    ageMax?: number;
    interests?: string[];
    gender?: "all" | "male" | "female";
  };
  startDate: string;
  endDate?: string;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    revenue: number;
    roas: number;
    cpc: number;
    ctr: number;
    conversionRate: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function addAdCampaign(uid: string, campaign: Omit<AdCampaign, "id" | "createdAt" | "updatedAt">) {
  try {
    const input = AddAdCampaignInputSchema.parse(campaign);
    const ref = doc(collection(db, "users", uid, "adCampaigns"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addAdCampaign", error);
  }
}

export async function getAdCampaigns(uid: string, limitCount = 50): Promise<AdCampaign[]> {
  try {
    const q = query(collection(db, "users", uid, "adCampaigns"), orderBy("createdAt", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...AdCampaignSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getAdCampaigns", error);
  }
}

export async function getAdCampaignById(uid: string, campaignId: string): Promise<AdCampaign | null> {
  try {
    const { getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "users", uid, "adCampaigns", campaignId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...AdCampaignSchema.parse(snap.data()) };
  } catch (error) {
    handleFirestoreError("getAdCampaignById", error);
  }
}

export async function getAdCampaignsByStatus(uid: string, status: AdCampaign["status"]): Promise<AdCampaign[]> {
  try {
    const q = query(collection(db, "users", uid, "adCampaigns"), where("status", "==", status), orderBy("createdAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...AdCampaignSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getAdCampaignsByStatus", error);
  }
}

export async function updateAdCampaign(uid: string, campaignId: string, updates: Partial<Omit<AdCampaign, "id" | "createdAt">>) {
  try {
    await updateDoc(doc(db, "users", uid, "adCampaigns", campaignId), { ...updates, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("updateAdCampaign", error);
  }
}

export async function deleteAdCampaign(uid: string, campaignId: string) {
  try {
    await deleteDoc(doc(db, "users", uid, "adCampaigns", campaignId));
  } catch (error) {
    handleFirestoreError("deleteAdCampaign", error);
  }
}
