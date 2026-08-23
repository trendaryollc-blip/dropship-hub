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

// ===== Revenue Tracking =====
export interface RevenueEntry {
  id: string;
  date: string;
  amount: number;
  orders: number;
  productTitle?: string;
  platform?: string;
  profit?: number;
  createdAt: Timestamp;
}

export async function addRevenueEntry(uid: string, entry: Omit<RevenueEntry, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "revenue"));
  await setDoc(ref, { ...entry, createdAt: serverTimestamp() });
}

export async function getRevenueEntries(uid: string, limitCount = 30): Promise<RevenueEntry[]> {
  const q = query(
    collection(db, "users", uid, "revenue"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RevenueEntry));
}

export async function deleteRevenueEntry(uid: string, entryId: string) {
  await deleteDoc(doc(db, "users", uid, "revenue", entryId));
}

// ===== Smart Alerts =====
export interface AlertEntry {
  id: string;
  type: "opportunity" | "risk" | "info" | "warning";
  title: string;
  description: string;
  action?: string;
  actionHref?: string;
  read: boolean;
  confidence?: number;
  aiAnalysis?: string;
  createdAt: Timestamp;
}

export async function addAlert(uid: string, alert: Omit<AlertEntry, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "alerts"));
  await setDoc(ref, { ...alert, createdAt: serverTimestamp() });
}

export async function getAlerts(uid: string, limitCount = 20): Promise<AlertEntry[]> {
  const q = query(
    collection(db, "users", uid, "alerts"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AlertEntry));
}

export async function markAlertRead(uid: string, alertId: string) {
  await updateDoc(doc(db, "users", uid, "alerts", alertId), { read: true });
}

export async function markAllAlertsRead(uid: string) {
  const alerts = await getAlerts(uid, 100);
  const unread = alerts.filter((a) => !a.read);
  for (const alert of unread) {
    await updateDoc(doc(db, "users", uid, "alerts", alert.id), { read: true });
  }
}

// ===== Daily Missions =====
export interface MissionEntry {
  id: string;
  text: string;
  done: boolean;
  date: string;
  createdAt: Timestamp;
}

export async function addMission(uid: string, mission: Omit<MissionEntry, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "missions"));
  await setDoc(ref, { ...mission, createdAt: serverTimestamp() });
}

export async function getMissions(uid: string, date?: string): Promise<MissionEntry[]> {
  const today = date || new Date().toISOString().split("T")[0];
  const q = query(
    collection(db, "users", uid, "missions"),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  const snap = await getDocs(q);
  const missions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MissionEntry));
  return missions.filter((m) => m.date === today);
}

export async function toggleMission(uid: string, missionId: string, done: boolean) {
  await updateDoc(doc(db, "users", uid, "missions", missionId), { done });
}

// ===== Watchlist =====
export interface WatchlistEntry {
  id: string;
  type: "product" | "niche" | "competitor";
  title: string;
  itemId: string;
  currentPrice?: number;
  targetPrice?: number;
  notes?: string;
  addedAt: Timestamp;
}

export async function addToWatchlist(uid: string, entry: Omit<WatchlistEntry, "id" | "addedAt">) {
  const favId = `${entry.type}_${entry.itemId}`;
  await setDoc(doc(db, "users", uid, "watchlist", favId), {
    ...entry,
    addedAt: serverTimestamp(),
  });
}

export async function removeFromWatchlist(uid: string, type: WatchlistEntry["type"], itemId: string) {
  const favId = `${type}_${itemId}`;
  await deleteDoc(doc(db, "users", uid, "watchlist", favId));
}

export async function getWatchlist(uid: string, type?: WatchlistEntry["type"]): Promise<WatchlistEntry[]> {
  const q = query(
    collection(db, "users", uid, "watchlist"),
    orderBy("addedAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WatchlistEntry));
  return type ? items.filter((i) => i.type === type) : items;
}

// ===== Search History =====
export interface SearchHistoryEntry {
  id: string;
  query: string;
  source: string;
  resultCount?: number;
  createdAt: Timestamp;
}

export async function addSearchHistory(uid: string, entry: Omit<SearchHistoryEntry, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "searchHistory"));
  await setDoc(ref, { ...entry, createdAt: serverTimestamp() });
}

export async function getSearchHistory(uid: string, limitCount = 20): Promise<SearchHistoryEntry[]> {
  const q = query(
    collection(db, "users", uid, "searchHistory"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SearchHistoryEntry));
}

export async function clearSearchHistory(uid: string) {
  const history = await getSearchHistory(uid, 100);
  for (const entry of history) {
    await deleteDoc(doc(db, "users", uid, "searchHistory", entry.id));
  }
}

// ===== Competitor Searches =====
export interface CompetitorSearchEntry {
  id: string;
  query: string;
  platformsFound: number;
  totalListings: number;
  avgPrice: number;
  createdAt: Timestamp;
}

export async function addCompetitorSearch(uid: string, entry: Omit<CompetitorSearchEntry, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "competitorSearches"));
  await setDoc(ref, { ...entry, createdAt: serverTimestamp() });
}

export async function getCompetitorSearches(uid: string, limitCount = 20): Promise<CompetitorSearchEntry[]> {
  const q = query(
    collection(db, "users", uid, "competitorSearches"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompetitorSearchEntry));
}

// ===== Product Enrichment Cache =====
export interface EnrichmentCacheEntry {
  id: string;
  productKey: string;
  data: Record<string, unknown>;
  createdAt: Timestamp;
}

export async function cacheEnrichment(uid: string, productKey: string, data: Record<string, unknown>) {
  await setDoc(doc(db, "users", uid, "enrichmentCache", productKey), {
    productKey,
    data,
    createdAt: serverTimestamp(),
  });
}

export async function getEnrichmentCache(uid: string, productKey: string): Promise<EnrichmentCacheEntry | null> {
  const snap = await getDoc(doc(db, "users", uid, "enrichmentCache", productKey));
  return snap.exists() ? { id: snap.id, ...snap.data() } as EnrichmentCacheEntry : null;
}
