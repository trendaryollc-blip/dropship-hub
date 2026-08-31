import { doc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { PushedProductSchema, AddPushedProductInputSchema } from "./schemas";

export interface PushedProduct {
  id: string;
  storeId: string;
  storeName: string;
  productTitle: string;
  productImage: string;
  productPrice: number;
  productUrl: string;
  productDescription: string;
  status: "pushed" | "live" | "error";
  pushedAt: Timestamp;
}

export async function addPushedProduct(uid: string, product: Omit<PushedProduct, "id" | "pushedAt">) {
  try {
    const input = AddPushedProductInputSchema.parse(product);
    const ref = doc(collection(db, "users", uid, "pushedProducts"));
    await setDoc(ref, { ...input, pushedAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("addPushedProduct", error);
  }
}

export async function getPushedProducts(uid: string): Promise<PushedProduct[]> {
  try {
    const q = query(collection(db, "users", uid, "pushedProducts"), orderBy("pushedAt", "desc"), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...PushedProductSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getPushedProducts", error);
  }
}

export async function deletePushedProduct(uid: string, productId: string) {
  try {
    await deleteDoc(doc(db, "users", uid, "pushedProducts", productId));
  } catch (error) {
    handleFirestoreError("deletePushedProduct", error);
  }
}
