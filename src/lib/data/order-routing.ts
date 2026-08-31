import { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { RoutingDecisionDocSchema, RoutingPreferencesDocSchema, AddRoutingDecisionInputSchema, SaveRoutingPreferencesInputSchema } from "./schemas";

export interface RoutingDecisionDoc {
  id: string;
  orderId: string;
  customerLocation: string;
  productTitle: string;
  selectedSupplier: string;
  shippingDays: number;
  shippingCost: number;
  totalCost: number;
  reasoning: string;
  status: string;
  routedAt: string;
  createdAt: Timestamp;
}

export async function addRoutingDecision(uid: string, decision: Omit<RoutingDecisionDoc, "id" | "createdAt">) {
  try {
    const input = AddRoutingDecisionInputSchema.parse(decision);
    const ref = doc(collection(db, "users", uid, "routingDecisions"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addRoutingDecision", error);
  }
}

export async function getRoutingDecisions(uid: string, limitCount = 30): Promise<RoutingDecisionDoc[]> {
  try {
    const q = query(collection(db, "users", uid, "routingDecisions"), orderBy("createdAt", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...RoutingDecisionDocSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getRoutingDecisions", error);
  }
}

export interface RoutingPreferencesDoc {
  id: string;
  optimization: "speed" | "cost" | "balanced";
  maxShippingDays: number;
  minQualityScore: number;
  preferLocalWarehouse: boolean;
  autoFallback: boolean;
  createdAt: Timestamp;
}

export async function saveRoutingPreferences(uid: string, prefs: Omit<RoutingPreferencesDoc, "id" | "createdAt">) {
  try {
    const input = SaveRoutingPreferencesInputSchema.parse(prefs);
    await setDoc(doc(db, "users", uid, "routingPreferences", "default"), { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("saveRoutingPreferences", error);
  }
}

export async function getRoutingPreferences(uid: string): Promise<RoutingPreferencesDoc | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "routingPreferences", "default"));
    return snap.exists() ? { id: snap.id, ...RoutingPreferencesDocSchema.parse(snap.data()) } : null;
  } catch (error) {
    handleFirestoreError("getRoutingPreferences", error);
  }
}
