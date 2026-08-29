import { getAdminDB } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ApiKeyEntry {
  id: string;
  key: string;
  label: string;
  priority: number;
  requestsUsed: number;
  requestsLimit: number;
  resetDate: string;
  lastError: string | null;
  lastTested: FieldValue | null;
  lastStatus: "healthy" | "error" | "untested";
}

export interface PlatformConfig {
  id: string;
  name: string;
  method: "official_api" | "rainforest" | "serpapi" | "scraperapi" | "custom_scraper";
  enabled: boolean;
  keys: ApiKeyEntry[];
  lastHealth: "healthy" | "error" | "untested";
  lastSearched: FieldValue | null;
  lastError: string | null;
  cooldownUntil: FieldValue | null;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export type PlatformInput = {
  name: string;
  slug?: string;
  method: PlatformConfig["method"];
  enabled?: boolean;
  apiKey?: string;
  keyLabel?: string;
  requestsLimit?: number;
  resetDate?: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function generateKeyId(): string {
  return `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function db() {
  return await getAdminDB();
}

const COLLECTION = "platforms";

// ── CRUD Operations ────────────────────────────────────────────────────────

export async function getAllPlatforms(): Promise<PlatformConfig[]> {
  const firestore = await db();
  const snap = await firestore.collection(COLLECTION).orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlatformConfig));
}

export async function getPlatform(id: string): Promise<PlatformConfig | null> {
  const firestore = await db();
  const snap = await firestore.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as PlatformConfig;
}

export async function createPlatform(input: PlatformInput): Promise<PlatformConfig> {
  const firestore = await db();
  const id = input.slug || input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  const keys: ApiKeyEntry[] = input.apiKey
    ? [
        {
          id: generateKeyId(),
          key: input.apiKey,
          label: input.keyLabel || "Primary",
          priority: 1,
          requestsUsed: 0,
          requestsLimit: input.requestsLimit || 100,
          resetDate: input.resetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          lastError: null,
          lastTested: null,
          lastStatus: "untested",
        },
      ]
    : [];

  const platform = {
    id,
    name: input.name,
    method: input.method,
    enabled: input.enabled ?? true,
    keys,
    lastHealth: "untested",
    lastSearched: null,
    lastError: null,
    cooldownUntil: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await firestore.collection(COLLECTION).doc(id).set(platform);
  return platform as PlatformConfig;
}

export async function updatePlatform(id: string, updates: Partial<Pick<PlatformConfig, "name" | "method" | "enabled">>): Promise<void> {
  const firestore = await db();
  await firestore.collection(COLLECTION).doc(id).update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deletePlatform(id: string): Promise<void> {
  const firestore = await db();
  await firestore.collection(COLLECTION).doc(id).delete();
}

// ── Key Management ─────────────────────────────────────────────────────────

export async function addPlatformKey(
  platformId: string,
  key: string,
  label: string,
  requestsLimit: number,
  resetDate: string
): Promise<void> {
  const platform = await getPlatform(platformId);
  if (!platform) throw new Error("Platform not found");

  const maxPriority = platform.keys.reduce((max, k) => Math.max(max, k.priority), 0);
  const newKey: ApiKeyEntry = {
    id: generateKeyId(),
    key,
    label,
    priority: maxPriority + 1,
    requestsUsed: 0,
    requestsLimit,
    resetDate,
    lastError: null,
    lastTested: null,
    lastStatus: "untested",
  };

  const firestore = await db();
  await firestore.collection(COLLECTION).doc(platformId).update({
    keys: [...platform.keys, newKey],
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function removePlatformKey(platformId: string, keyId: string): Promise<void> {
  const platform = await getPlatform(platformId);
  if (!platform) throw new Error("Platform not found");

  const filtered = platform.keys.filter((k) => k.id !== keyId);
  const reassigned = filtered.map((k, i) => ({ ...k, priority: i + 1 }));

  const firestore = await db();
  await firestore.collection(COLLECTION).doc(platformId).update({
    keys: reassigned,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function updatePlatformKey(
  platformId: string,
  keyId: string,
  updates: Partial<Pick<ApiKeyEntry, "key" | "label" | "requestsLimit" | "resetDate">>
): Promise<void> {
  const platform = await getPlatform(platformId);
  if (!platform) throw new Error("Platform not found");

  const updatedKeys = platform.keys.map((k) =>
    k.id === keyId ? { ...k, ...updates } : k
  );

  const firestore = await db();
  await firestore.collection(COLLECTION).doc(platformId).update({
    keys: updatedKeys,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function reorderPlatformKeys(platformId: string, keyIds: string[]): Promise<void> {
  const platform = await getPlatform(platformId);
  if (!platform) throw new Error("Platform not found");

  const reordered = keyIds.map((id, i) => {
    const key = platform.keys.find((k) => k.id === id);
    if (!key) throw new Error(`Key ${id} not found`);
    return { ...key, priority: i + 1 };
  });

  const firestore = await db();
  await firestore.collection(COLLECTION).doc(platformId).update({
    keys: reordered,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ── Usage Tracking ─────────────────────────────────────────────────────────

export async function incrementKeyUsage(platformId: string, keyId: string): Promise<void> {
  const platform = await getPlatform(platformId);
  if (!platform) return;

  const updatedKeys = platform.keys.map((k) =>
    k.id === keyId ? { ...k, requestsUsed: k.requestsUsed + 1 } : k
  );

  const firestore = await db();
  await firestore.collection(COLLECTION).doc(platformId).update({
    keys: updatedKeys,
    lastSearched: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function markKeyError(platformId: string, keyId: string, error: string): Promise<void> {
  const platform = await getPlatform(platformId);
  if (!platform) return;

  const updatedKeys = platform.keys.map((k) =>
    k.id === keyId ? { ...k, lastError: error, lastStatus: "error" as const } : k
  );

  const firestore = await db();
  await firestore.collection(COLLECTION).doc(platformId).update({
    keys: updatedKeys,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function markKeyHealthy(platformId: string, keyId: string): Promise<void> {
  const platform = await getPlatform(platformId);
  if (!platform) return;

  const updatedKeys = platform.keys.map((k) =>
    k.id === keyId ? { ...k, lastError: null, lastStatus: "healthy" as const, lastTested: new Date() } : k
  );

  const firestore = await db();
  await firestore.collection(COLLECTION).doc(platformId).update({
    keys: updatedKeys,
    lastHealth: "healthy",
    lastError: null,
    cooldownUntil: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setPlatformCooldown(platformId: string, minutes: number): Promise<void> {
  const cooldownUntil = new Date(Date.now() + minutes * 60 * 1000);
  const firestore = await db();
  await firestore.collection(COLLECTION).doc(platformId).update({
    cooldownUntil,
    lastHealth: "error",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function resetKeyUsage(platformId: string, keyId: string): Promise<void> {
  const platform = await getPlatform(platformId);
  if (!platform) return;

  const updatedKeys = platform.keys.map((k) =>
    k.id === keyId ? { ...k, requestsUsed: 0, lastError: null, lastStatus: "untested" as const } : k
  );

  const firestore = await db();
  await firestore.collection(COLLECTION).doc(platformId).update({
    keys: updatedKeys,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ── Key Selection (for search engine) ──────────────────────────────────────

export function selectBestKey(keys: ApiKeyEntry[]): ApiKeyEntry | null {
  const now = new Date();

  const available = keys
    .filter((k) => {
      if (k.resetDate && new Date(k.resetDate) <= now) return true;
      return k.requestsUsed < k.requestsLimit;
    })
    .sort((a, b) => a.priority - b.priority);

  return available[0] || null;
}
