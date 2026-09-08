import { doc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { AdConnectionSchema, AddAdConnectionInputSchema } from "./schemas";

export interface AdConnection {
  id: string;
  platform: "facebook" | "google";
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  status: "active" | "expired" | "error";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function addAdConnection(uid: string, connection: Omit<AdConnection, "id" | "createdAt" | "updatedAt">) {
  try {
    const input = AddAdConnectionInputSchema.parse(connection);
    const ref = doc(collection(db, "users", uid, "adConnections"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addAdConnection", error);
  }
}

export async function getAdConnections(uid: string): Promise<AdConnection[]> {
  try {
    const q = query(collection(db, "users", uid, "adConnections"), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...AdConnectionSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getAdConnections", error);
  }
}

export async function getAdConnectionByPlatform(uid: string, platform: "facebook" | "google"): Promise<AdConnection | null> {
  try {
    const q = query(collection(db, "users", uid, "adConnections"), orderBy("createdAt", "desc"), limit(20));
    const snap = await getDocs(q);
    const match = snap.docs.find((d) => d.data().platform === platform && d.data().status === "active");
    return match ? { id: match.id, ...AdConnectionSchema.parse(match.data()) } : null;
  } catch (error) {
    handleFirestoreError("getAdConnectionByPlatform", error);
  }
}

export async function deleteAdConnection(uid: string, connectionId: string) {
  try {
    await deleteDoc(doc(db, "users", uid, "adConnections", connectionId));
  } catch (error) {
    handleFirestoreError("deleteAdConnection", error);
  }
}

export async function updateAdConnection(uid: string, connectionId: string, updates: Partial<Pick<AdConnection, "status" | "accessToken" | "refreshToken" | "expiresAt">>) {
  try {
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "users", uid, "adConnections", connectionId), { ...updates, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("updateAdConnection", error);
  }
}
