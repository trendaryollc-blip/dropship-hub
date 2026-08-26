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
  digestSettings: {
    enabled: boolean;
    frequency: "daily" | "weekly";
    includeMetrics: boolean;
    includeAlerts: boolean;
    includeRecommendations: boolean;
    includeWeeklyTrend: boolean;
  };
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
  digestSettings: {
    enabled: true,
    frequency: "daily",
    includeMetrics: true,
    includeAlerts: true,
    includeRecommendations: true,
    includeWeeklyTrend: true,
  },
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
    const q = query(
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
    const q = query(
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

// ===== Daily Intelligence Digest =====
export interface DigestEntry {
  id: string;
  date: string;
  summary: string;
  metrics: {
    orders: number;
    revenue: number;
    profit: number;
    stockAlerts: number;
    supplierDelays: number;
  };
  alerts: {
    type: "stock" | "supplier" | "adSpend" | "trend";
    title: string;
    description: string;
    severity: "low" | "medium" | "high";
  }[];
  recommendations: string[];
  weeklyTrend?: {
    direction: "up" | "down" | "stable";
    percentage: number;
    insight: string;
  };
  generatedAt: Timestamp;
}

export async function saveDigest(uid: string, digest: Omit<DigestEntry, "id" | "generatedAt">) {
  const ref = doc(collection(db, "users", uid, "digests"));
  await setDoc(ref, { ...digest, generatedAt: serverTimestamp() });
}

export async function getDigests(uid: string, limitCount = 7): Promise<DigestEntry[]> {
  const q = query(
    collection(db, "users", uid, "digests"),
    orderBy("generatedAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DigestEntry));
}

export async function getLatestDigest(uid: string): Promise<DigestEntry | null> {
  const digests = await getDigests(uid, 1);
  return digests.length > 0 ? digests[0] : null;
}

export async function deleteDigest(uid: string, digestId: string) {
  await deleteDoc(doc(db, "users", uid, "digests", digestId));
}

// ===== Profit Tracker =====
export interface CostProfileEntry {
  id: string;
  productId: string;
  productTitle: string;
  cogs: number;
  shippingCost: number;
  platformFeePercent: number;
  paymentProcessingPercent: number;
  packagingCost: number;
  otherCosts: number;
  createdAt: Timestamp;
}

export async function addCostProfile(uid: string, entry: Omit<CostProfileEntry, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "costProfiles"));
  await setDoc(ref, { ...entry, createdAt: serverTimestamp() });
}

export async function getCostProfiles(uid: string): Promise<CostProfileEntry[]> {
  const q = query(collection(db, "users", uid, "costProfiles"), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CostProfileEntry));
}

export async function deleteCostProfile(uid: string, profileId: string) {
  await deleteDoc(doc(db, "users", uid, "costProfiles", profileId));
}

export interface ProfitEntryDoc {
  id: string;
  orderId: string;
  date: string;
  productTitle: string;
  platform: string;
  revenue: number;
  cogs: number;
  shippingCost: number;
  platformFee: number;
  paymentProcessing: number;
  refunds: number;
  adSpend: number;
  netProfit: number;
  profitMargin: number;
  createdAt: Timestamp;
}

export async function addProfitEntry(uid: string, entry: Omit<ProfitEntryDoc, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "profitEntries"));
  await setDoc(ref, { ...entry, createdAt: serverTimestamp() });
}

export async function getProfitEntries(uid: string, limitCount = 50): Promise<ProfitEntryDoc[]> {
  const q = query(collection(db, "users", uid, "profitEntries"), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProfitEntryDoc));
}

// ===== Supplier Performance =====
export interface SupplierPerformanceDoc {
  id: string;
  supplierId: string;
  supplierName: string;
  reliabilityScore: number;
  refundRate: number;
  avgShippingDays: number;
  complaintRate: number;
  stockReliability: number;
  snapshotDate: string;
  createdAt: Timestamp;
}

export async function addSupplierPerformance(uid: string, entry: Omit<SupplierPerformanceDoc, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "supplierPerformance"));
  await setDoc(ref, { ...entry, createdAt: serverTimestamp() });
}

export async function getSupplierPerformanceHistory(uid: string, supplierId: string): Promise<SupplierPerformanceDoc[]> {
  const q = query(collection(db, "users", uid, "supplierPerformance"), orderBy("createdAt", "desc"), limit(30));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupplierPerformanceDoc)).filter((e) => e.supplierId === supplierId);
}

export interface SupplierAlertDoc {
  id: string;
  supplierId: string;
  supplierName: string;
  type: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  read: boolean;
  createdAt: Timestamp;
}

export async function addSupplierAlert(uid: string, alert: Omit<SupplierAlertDoc, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "supplierAlerts"));
  await setDoc(ref, { ...alert, createdAt: serverTimestamp() });
}

export async function getSupplierAlerts(uid: string): Promise<SupplierAlertDoc[]> {
  const q = query(collection(db, "users", uid, "supplierAlerts"), orderBy("createdAt", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupplierAlertDoc));
}

// ===== Product Lifecycle =====
export interface ProductLifecycleDoc {
  id: string;
  productId: string;
  productTitle: string;
  currentStage: string;
  stageEnteredAt: string;
  totalDaysTracked: number;
  createdAt: Timestamp;
}

export async function addProductLifecycle(uid: string, entry: Omit<ProductLifecycleDoc, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "productLifecycle"));
  await setDoc(ref, { ...entry, createdAt: serverTimestamp() });
}

export async function getProductLifecycles(uid: string): Promise<ProductLifecycleDoc[]> {
  const q = query(collection(db, "users", uid, "productLifecycle"), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductLifecycleDoc));
}

export interface LifecycleSnapshotDoc {
  id: string;
  productId: string;
  date: string;
  stage: string;
  orders: number;
  revenue: number;
  profit: number;
  competitionCount: number;
  searchVolume: number;
  createdAt: Timestamp;
}

export async function addLifecycleSnapshot(uid: string, snapshot: Omit<LifecycleSnapshotDoc, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "lifecycleSnapshots"));
  await setDoc(ref, { ...snapshot, createdAt: serverTimestamp() });
}

export async function getLifecycleSnapshots(uid: string, productId: string): Promise<LifecycleSnapshotDoc[]> {
  const q = query(collection(db, "users", uid, "lifecycleSnapshots"), orderBy("createdAt", "desc"), limit(90));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LifecycleSnapshotDoc)).filter((s) => s.productId === productId);
}

export interface LifecycleAlertDoc {
  id: string;
  productId: string;
  productTitle: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  read: boolean;
  createdAt: Timestamp;
}

export async function addLifecycleAlert(uid: string, alert: Omit<LifecycleAlertDoc, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "lifecycleAlerts"));
  await setDoc(ref, { ...alert, createdAt: serverTimestamp() });
}

export async function getLifecycleAlerts(uid: string): Promise<LifecycleAlertDoc[]> {
  const q = query(collection(db, "users", uid, "lifecycleAlerts"), orderBy("createdAt", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LifecycleAlertDoc));
}

// ===== Customer Service =====
export interface CSConversationDoc {
  id: string;
  customerName: string;
  customerEmail: string;
  platform: string;
  status: "active" | "escalated" | "resolved" | "waiting";
  subject: string;
  lastMessage: string;
  messageCount: number;
  aiHandled: boolean;
  createdAt: Timestamp;
}

export async function addCSConversation(uid: string, conv: Omit<CSConversationDoc, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "csConversations"));
  await setDoc(ref, { ...conv, createdAt: serverTimestamp() });
}

export async function getCSConversations(uid: string): Promise<CSConversationDoc[]> {
  const q = query(collection(db, "users", uid, "csConversations"), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CSConversationDoc));
}

export interface CSMessageDoc {
  id: string;
  conversationId: string;
  role: "customer" | "ai" | "agent";
  content: string;
  confidence?: number;
  escalated?: boolean;
  createdAt: Timestamp;
}

export async function addCSMessage(uid: string, msg: Omit<CSMessageDoc, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "csMessages"));
  await setDoc(ref, { ...msg, createdAt: serverTimestamp() });
}

export async function getCSMessages(uid: string, conversationId: string): Promise<CSMessageDoc[]> {
  const q = query(collection(db, "users", uid, "csMessages"), orderBy("createdAt", "asc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CSMessageDoc)).filter((m) => m.conversationId === conversationId);
}

export interface CSTemplateDoc {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  variables: string[];
  usageCount: number;
  createdAt: Timestamp;
}

export async function addCSTemplate(uid: string, template: Omit<CSTemplateDoc, "id" | "createdAt">) {
  const ref = doc(collection(db, "users", uid, "csTemplates"));
  await setDoc(ref, { ...template, createdAt: serverTimestamp() });
}

export async function getCSTemplates(uid: string): Promise<CSTemplateDoc[]> {
  const q = query(collection(db, "users", uid, "csTemplates"), orderBy("createdAt", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CSTemplateDoc));
}

export async function deleteCSTemplate(uid: string, templateId: string) {
  await deleteDoc(doc(db, "users", uid, "csTemplates", templateId));
}

// ===== Order Router =====
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
  const ref = doc(collection(db, "users", uid, "routingDecisions"));
  await setDoc(ref, { ...decision, createdAt: serverTimestamp() });
}

export async function getRoutingDecisions(uid: string, limitCount = 30): Promise<RoutingDecisionDoc[]> {
  const q = query(collection(db, "users", uid, "routingDecisions"), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutingDecisionDoc));
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
  await setDoc(doc(db, "users", uid, "routingPreferences", "default"), { ...prefs, createdAt: serverTimestamp() });
}

export async function getRoutingPreferences(uid: string): Promise<RoutingPreferencesDoc | null> {
  const snap = await getDoc(doc(db, "users", uid, "routingPreferences", "default"));
  return snap.exists() ? { id: snap.id, ...snap.data() } as RoutingPreferencesDoc : null;
}

// ===== Store Connections =====
export interface StoreConnection {
  id: string;
  platform: string;
  name: string;
  url: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  storeDomain: string;
  status: "connected" | "disconnected" | "error";
  connectedAt: Timestamp;
  lastSyncAt?: Timestamp;
}

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
  const ref = doc(collection(db, "users", uid, "storeConnections"));
  await setDoc(ref, { ...store, connectedAt: serverTimestamp() });
  return ref.id;
}

export async function getStoreConnections(uid: string): Promise<StoreConnection[]> {
  const q = query(collection(db, "users", uid, "storeConnections"), orderBy("connectedAt", "desc"), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoreConnection));
}

export async function deleteStoreConnection(uid: string, storeId: string) {
  await deleteDoc(doc(db, "users", uid, "storeConnections", storeId));
}

export async function updateStoreConnection(uid: string, storeId: string, updates: Partial<StoreConnection>) {
  await updateDoc(doc(db, "users", uid, "storeConnections", storeId), updates);
}

// ===== Pushed Products =====
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
  const ref = doc(collection(db, "users", uid, "pushedProducts"));
  await setDoc(ref, { ...product, pushedAt: serverTimestamp() });
  return ref.id;
}

export async function getPushedProducts(uid: string): Promise<PushedProduct[]> {
  const q = query(collection(db, "users", uid, "pushedProducts"), orderBy("pushedAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PushedProduct));
}

export async function deletePushedProduct(uid: string, productId: string) {
  await deleteDoc(doc(db, "users", uid, "pushedProducts", productId));
}
