import { doc, setDoc, deleteDoc, getDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { FavoriteSchema, AddFavoriteInputSchema } from "./schemas";

export interface Favorite {
  id: string;
  type: "product" | "supplier" | "niche";
  itemId: string;
  title: string;
  addedAt: Timestamp;
}

export async function addFavorite(uid: string, type: Favorite["type"], itemId: string, title: string) {
  try {
    const input = AddFavoriteInputSchema.parse({ type, itemId, title });
    const favId = `${input.type}_${input.itemId}`;
    await setDoc(doc(db, "users", uid, "favorites", favId), {
      type: input.type,
      itemId: input.itemId,
      title: input.title,
      addedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError("addFavorite", error);
  }
}

export async function removeFavorite(uid: string, type: Favorite["type"], itemId: string) {
  try {
    const favId = `${type}_${itemId}`;
    await deleteDoc(doc(db, "users", uid, "favorites", favId));
  } catch (error) {
    handleFirestoreError("removeFavorite", error);
  }
}

export async function getFavorites(uid: string, type?: Favorite["type"]): Promise<Favorite[]> {
  try {
    let q;
    if (type) {
      q = query(
        collection(db, "users", uid, "favorites"),
        where("type", "==", type),
        orderBy("addedAt", "desc"),
        limit(50)
      );
    } else {
      q = query(
        collection(db, "users", uid, "favorites"),
        orderBy("addedAt", "desc"),
        limit(50)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...FavoriteSchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getFavorites", error);
  }
}

export async function isFavorited(uid: string, type: Favorite["type"], itemId: string): Promise<boolean> {
  try {
    const favId = `${type}_${itemId}`;
    const snap = await getDoc(doc(db, "users", uid, "favorites", favId));
    return snap.exists();
  } catch (error) {
    handleFirestoreError("isFavorited", error);
  }
}
