import { getAdminDB } from "@/lib/firebase-admin";
import { handleFirestoreError } from "./utils";
import { AddProductValidationInputSchema } from "./schemas";

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
  riskScore?: number;
  supplierScore?: number;
  competitionScore?: number;
  authenticityScore?: number;
  marketScore?: number;
  inputs: Record<string, unknown>;
  createdAt: unknown;
}

export async function addProductValidation(
  uid: string,
  entry: Omit<ProductValidationDoc, "id" | "createdAt">
): Promise<void> {
  try {
    const input = AddProductValidationInputSchema.parse(entry);
    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("productValidations").doc();
    await ref.set({ ...input, createdAt: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError("addProductValidation", error);
  }
}

export async function getProductValidations(uid: string, maxResults: number = 20): Promise<ProductValidationDoc[]> {
  try {
    const db = await getAdminDB();
    const snap = await db
      .collection("users").doc(uid).collection("productValidations")
      .orderBy("createdAt", "desc")
      .limit(maxResults)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductValidationDoc));
  } catch (error) {
    handleFirestoreError("getProductValidations", error);
  }
}

export async function getProductValidation(uid: string, id: string): Promise<ProductValidationDoc | null> {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("productValidations").doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as ProductValidationDoc;
  } catch (error) {
    handleFirestoreError("getProductValidation", error);
  }
}

export async function deleteProductValidation(uid: string, id: string): Promise<void> {
  try {
    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("productValidations").doc(id).delete();
  } catch (error) {
    handleFirestoreError("deleteProductValidation", error);
  }
}
