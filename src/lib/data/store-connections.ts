import { doc, setDoc, deleteDoc, updateDoc, collection, query, orderBy, limit, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import type { StoreConnection } from "@/types/fulfillment";
import { StoreConnectionSchema, AddStoreConnectionInputSchema } from "./schemas";

export type { StoreConnection };

export type StorePlatform = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  fields: StoreField[];
  authType: "api_key" | "oauth" | "manual";
};

export type StoreField = {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "password" | "url";
  helpText?: string;
  required: boolean;
};

export async function addStoreConnection(uid: string, store: Omit<StoreConnection, "id" | "connectedAt">) {
  try {
    const input = AddStoreConnectionInputSchema.parse(store);
    const ref = doc(collection(db, "users", uid, "storeConnections"));
    await setDoc(ref, { ...input, connectedAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addStoreConnection", error);
  }
}

export async function getStoreConnections(uid: string): Promise<StoreConnection[]> {
  try {
    const q = query(collection(db, "users", uid, "storeConnections"), orderBy("connectedAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...StoreConnectionSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getStoreConnections", error);
  }
}

export async function deleteStoreConnection(uid: string, storeId: string) {
  try {
    await deleteDoc(doc(db, "users", uid, "storeConnections", storeId));
  } catch (error) {
    handleFirestoreError("deleteStoreConnection", error);
  }
}

export async function updateStoreConnection(uid: string, storeId: string, updates: Partial<StoreConnection>) {
  try {
    await updateDoc(doc(db, "users", uid, "storeConnections", storeId), updates);
  } catch (error) {
    handleFirestoreError("updateStoreConnection", error);
  }
}
