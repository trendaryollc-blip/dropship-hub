import { getAdminDB } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { PlatformFirestoreConfigSchema } from "./data/schemas";

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

export interface PlatformConnector {
  // No-code ("point at title/price/image") and AI-generated connectors.
  searchUrlTemplate?: string; // e.g. https://www.walmart.com/search?q={{query}}
  linkPatternSrc?: string; // regex string used to find product result links
  siteKey?: string; // if set, reuses a built-in scraperSearchConfig entry
  selectors?: {
    title?: string;
    price?: string;
    image?: string;
    link?: string;
  };
  aiGenerated?: boolean;
}

export interface PlatformFirestoreConfig {
  id: string;
  name: string;
  method: "official_api" | "rainforest" | "serpapi" | "serper" | "rapidapi_walmart" | "scraperapi" | "custom_scraper";
  enabled: boolean;
  keys: ApiKeyEntry[];
  connector?: PlatformConnector;
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
  method: PlatformFirestoreConfig["method"];
  enabled?: boolean;
  apiKey?: string;
  keyLabel?: string;
  requestsLimit?: number;
  resetDate?: string;
  connector?: PlatformConnector;
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

export async function getAllPlatforms(): Promise<PlatformFirestoreConfig[]> {
  const firestore = await db();
  const snap = await firestore.collection(COLLECTION).orderBy("createdAt", "asc").get();
  return snap.docs.map((d) => ({ id: d.id, ...PlatformFirestoreConfigSchema.parse(d.data()) }));
}

export async function getPlatform(id: string): Promise<PlatformFirestoreConfig | null> {
  const firestore = await db();
  const snap = await firestore.collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...PlatformFirestoreConfigSchema.parse(snap.data()) };
}

export async function createPlatform(input: PlatformInput): Promise<PlatformFirestoreConfig> {
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
    connector: input.connector,
    lastHealth: "untested",
    lastSearched: null,
    lastError: null,
    cooldownUntil: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await firestore.collection(COLLECTION).doc(id).set(platform);
  return platform as PlatformFirestoreConfig;
}

export async function updatePlatform(id: string, updates: Partial<Pick<PlatformFirestoreConfig, "name" | "method" | "enabled">>): Promise<void> {
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

// ── Key Management (Transaction-safe) ──────────────────────────────────────

export async function addPlatformKey(
  platformId: string,
  key: string,
  label: string,
  requestsLimit: number,
  resetDate: string
): Promise<void> {
  const firestore = await db();
  const docRef = firestore.collection(COLLECTION).doc(platformId);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) throw new Error("Platform not found");
    const platform = snap.data() as PlatformFirestoreConfig;

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

    tx.update(docRef, {
      keys: [...platform.keys, newKey],
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function removePlatformKey(platformId: string, keyId: string): Promise<void> {
  const firestore = await db();
  const docRef = firestore.collection(COLLECTION).doc(platformId);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) throw new Error("Platform not found");
    const platform = snap.data() as PlatformFirestoreConfig;

    const filtered = platform.keys.filter((k) => k.id !== keyId);
    const reassigned = filtered.map((k, i) => ({ ...k, priority: i + 1 }));

    tx.update(docRef, {
      keys: reassigned,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function updatePlatformKey(
  platformId: string,
  keyId: string,
  updates: Partial<Pick<ApiKeyEntry, "key" | "label" | "requestsLimit" | "resetDate">>
): Promise<void> {
  const firestore = await db();
  const docRef = firestore.collection(COLLECTION).doc(platformId);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) throw new Error("Platform not found");
    const platform = snap.data() as PlatformFirestoreConfig;

    const updatedKeys = platform.keys.map((k) =>
      k.id === keyId ? { ...k, ...updates } : k
    );

    tx.update(docRef, {
      keys: updatedKeys,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function reorderPlatformKeys(platformId: string, keyIds: string[]): Promise<void> {
  const firestore = await db();
  const docRef = firestore.collection(COLLECTION).doc(platformId);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) throw new Error("Platform not found");
    const platform = snap.data() as PlatformFirestoreConfig;

    const reordered = keyIds.map((id, i) => {
      const key = platform.keys.find((k) => k.id === id);
      if (!key) throw new Error(`Key ${id} not found`);
      return { ...key, priority: i + 1 };
    });

    tx.update(docRef, {
      keys: reordered,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

// ── Usage Tracking (Transaction-safe) ──────────────────────────────────────

export async function incrementKeyUsage(platformId: string, keyId: string): Promise<void> {
  const firestore = await db();
  const docRef = firestore.collection(COLLECTION).doc(platformId);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return;
    const platform = snap.data() as PlatformFirestoreConfig;

    const updatedKeys = platform.keys.map((k) =>
      k.id === keyId ? { ...k, requestsUsed: k.requestsUsed + 1 } : k
    );

    tx.update(docRef, {
      keys: updatedKeys,
      lastSearched: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function markKeyError(platformId: string, keyId: string, error: string): Promise<void> {
  const firestore = await db();
  const docRef = firestore.collection(COLLECTION).doc(platformId);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return;
    const platform = snap.data() as PlatformFirestoreConfig;

    const updatedKeys = platform.keys.map((k) =>
      k.id === keyId ? { ...k, lastError: error, lastStatus: "error" as const } : k
    );

    tx.update(docRef, {
      keys: updatedKeys,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function markKeyHealthy(platformId: string, keyId: string): Promise<void> {
  const firestore = await db();
  const docRef = firestore.collection(COLLECTION).doc(platformId);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return;
    const platform = snap.data() as PlatformFirestoreConfig;

    const updatedKeys = platform.keys.map((k) =>
      k.id === keyId ? { ...k, lastError: null, lastStatus: "healthy" as const, lastTested: new Date() } : k
    );

    tx.update(docRef, {
      keys: updatedKeys,
      lastHealth: "healthy",
      lastError: null,
      cooldownUntil: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function setPlatformCooldown(platformId: string, minutes: number): Promise<void> {
  const firestore = await db();
  const docRef = firestore.collection(COLLECTION).doc(platformId);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) throw new Error("Platform not found");

    const cooldownUntil = new Date(Date.now() + minutes * 60 * 1000);
    tx.update(docRef, {
      cooldownUntil,
      lastHealth: "error",
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function resetKeyUsage(platformId: string, keyId: string): Promise<void> {
  const firestore = await db();
  const docRef = firestore.collection(COLLECTION).doc(platformId);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return;
    const platform = snap.data() as PlatformFirestoreConfig;

    const updatedKeys = platform.keys.map((k) =>
      k.id === keyId ? { ...k, requestsUsed: 0, lastError: null, lastStatus: "untested" as const } : k
    );

    tx.update(docRef, {
      keys: updatedKeys,
      updatedAt: FieldValue.serverTimestamp(),
    });
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
