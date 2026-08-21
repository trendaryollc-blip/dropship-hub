import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ===== User Settings =====
export interface UserSettings {
  aiProviderPriority: { id: string; active: boolean; priority: number }[];
  defaultCurrency: string;
  notifications: boolean;
  theme: "dark" | "light";
}

const defaultSettings: UserSettings = {
  aiProviderPriority: [
    { id: "gemini", active: true, priority: 1 },
    { id: "groq", active: true, priority: 2 },
    { id: "mistral", active: true, priority: 3 },
    { id: "openai", active: false, priority: 4 },
  ],
  defaultCurrency: "USD",
  notifications: true,
  theme: "dark",
};

export async function getUserSettings(uid: string): Promise<UserSettings> {
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) {
    return { ...defaultSettings, ...snap.data() } as UserSettings;
  }
  await setDoc(doc(db, "users", uid), {
    ...defaultSettings,
    createdAt: serverTimestamp(),
  });
  return defaultSettings;
}

export async function updateUserSettings(uid: string, settings: Partial<UserSettings>) {
  await updateDoc(doc(db, "users", uid), settings);
}

// ===== Favorites =====
export interface Favorite {
  id: string;
  type: "product" | "supplier" | "niche";
  itemId: string;
  title: string;
  addedAt: Timestamp;
}

export async function addFavorite(uid: string, type: Favorite["type"], itemId: string, title: string) {
  const favId = `${type}_${itemId}`;
  await setDoc(doc(db, "users", uid, "favorites", favId), {
    type,
    itemId,
    title,
    addedAt: serverTimestamp(),
  });
}

export async function removeFavorite(uid: string, type: Favorite["type"], itemId: string) {
  const favId = `${type}_${itemId}`;
  await deleteDoc(doc(db, "users", uid, "favorites", favId));
}

export async function getFavorites(uid: string, type?: Favorite["type"]): Promise<Favorite[]> {
  let q = query(
    collection(db, "users", uid, "favorites"),
    orderBy("addedAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  const favorites = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Favorite));
  return type ? favorites.filter((f) => f.type === type) : favorites;
}

export async function isFavorited(uid: string, type: Favorite["type"], itemId: string): Promise<boolean> {
  const favId = `${type}_${itemId}`;
  const snap = await getDoc(doc(db, "users", uid, "favorites", favId));
  return snap.exists();
}

// ===== Calculator History =====
export interface CalcHistoryEntry {
  id: string;
  type: "profit" | "shipping" | "landed" | "margin" | "adroi";
  inputs: Record<string, number>;
  result: Record<string, number>;
  savedAt: Timestamp;
}

export async function saveCalcHistory(uid: string, entry: Omit<CalcHistoryEntry, "id" | "savedAt">) {
  const ref = doc(collection(db, "users", uid, "calcHistory"));
  await setDoc(ref, { ...entry, savedAt: serverTimestamp() });
}

export async function getCalcHistory(uid: string, type?: CalcHistoryEntry["type"]): Promise<CalcHistoryEntry[]> {
  let q = query(
    collection(db, "users", uid, "calcHistory"),
    orderBy("savedAt", "desc"),
    limit(20)
  );
  const snap = await getDocs(q);
  const history = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CalcHistoryEntry));
  return type ? history.filter((h) => h.type === type) : history;
}

// ===== Chat History =====
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  timestamp: Timestamp;
}

export async function saveChatMessage(uid: string, msg: Omit<ChatMessage, "id" | "timestamp">) {
  const ref = doc(collection(db, "users", uid, "chatHistory"));
  await setDoc(ref, { ...msg, timestamp: serverTimestamp() });
}

export async function getChatHistory(uid: string): Promise<ChatMessage[]> {
  const q = query(
    collection(db, "users", uid, "chatHistory"),
    orderBy("timestamp", "asc"),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
}

// ===== Product Notes =====
export interface ProductNote {
  id: string;
  productId: string;
  note: string;
  updatedAt: Timestamp;
}

export async function saveProductNote(uid: string, productId: string, note: string) {
  await setDoc(doc(db, "users", uid, "notes", productId), {
    productId,
    note,
    updatedAt: serverTimestamp(),
  });
}

export async function getProductNote(uid: string, productId: string): Promise<string> {
  const snap = await getDoc(doc(db, "users", uid, "notes", productId));
  return snap.exists() ? snap.data().note : "";
}
