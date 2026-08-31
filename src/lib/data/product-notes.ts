import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";

export interface ProductNote {
  id: string;
  productId: string;
  note: string;
  updatedAt: Timestamp;
}

export async function saveProductNote(uid: string, productId: string, note: string) {
  try {
    await setDoc(doc(db, "users", uid, "notes", productId), {
      productId,
      note,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError("saveProductNote", error);
  }
}

export async function getProductNote(uid: string, productId: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "notes", productId));
    return snap.exists() ? snap.data().note : "";
  } catch (error) {
    handleFirestoreError("getProductNote", error);
  }
}
