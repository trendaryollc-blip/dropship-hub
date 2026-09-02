import { doc, setDoc, deleteDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { ProductValidationDocSchema, AddProductValidationInputSchema } from "./schemas";

export interface ProductValidationDoc {
  id: string;
  productTitle: string;
  productImage?: string;
  productUrl?: string;
  goldenScore: number;
  goldenRank: string;
  trendVelocity: number;
  saturationIndex: number;
  profitScore: number;
  seasonalScore: number;
  inputs: Record<string, unknown>;
  createdAt: Timestamp;
}

export async function addProductValidation(
  uid: string,
  entry: Omit<ProductValidationDoc, "id" | "createdAt">
): Promise<void> {
  try {
    const input = AddProductValidationInputSchema.parse(entry);
    const ref = doc(collection(db, "users", uid, "productValidations"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addProductValidation", error);
  }
}

export async function getProductValidations(uid: string, maxResults: number = 20): Promise<ProductValidationDoc[]> {
  try {
    const q = query(
      collection(db, "users", uid, "productValidations"),
      orderBy("createdAt", "desc"),
      limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...ProductValidationDocSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getProductValidations", error);
  }
}

export async function getProductValidation(uid: string, id: string): Promise<ProductValidationDoc | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "productValidations", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...ProductValidationDocSchema.parse(snap.data()) };
  } catch (error) {
    handleFirestoreError("getProductValidation", error);
  }
}

export async function deleteProductValidation(uid: string, id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "users", uid, "productValidations", id));
  } catch (error) {
    handleFirestoreError("deleteProductValidation", error);
  }
}
