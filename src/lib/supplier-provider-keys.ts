import { getAdminDB } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { createLogger } from "@/lib/logger";
import { safeErrorMessage } from "@/lib/api-errors";

const logger = createLogger({ module: "supplier-provider-keys" });

const COLLECTION = "system";
const DOC_ID = "supplierProviderKeys";

export interface SupplierProviderKeyEntry {
  id: string;
  key: string;
  label: string;
  priority: number;
  requestsUsed: number;
  requestsLimit: number;
  resetDate: string;
  lastError: string | null;
  lastStatus: "healthy" | "error" | "untested";
}

export function isUsableSupplierProviderKey(entry: SupplierProviderKeyEntry): boolean {
  if (!entry || typeof entry.key !== "string" || entry.key.length === 0) return false;
  if (entry.lastStatus === "error") return false;
  if (entry.requestsLimit > 0 && entry.requestsUsed >= entry.requestsLimit) return false;
  return true;
}

export async function getSupplierProviderKeys(provider: string): Promise<SupplierProviderKeyEntry[]> {
  try {
    const db = await getAdminDB();
    if (!db) return [];
    const doc = await db.collection(COLLECTION).doc(DOC_ID).get();
    const data = (doc.exists ? doc.data() : null) || {};
    const keys = (data as Record<string, unknown>)[provider];
    if (!Array.isArray(keys)) return [];
    return ([...keys] as SupplierProviderKeyEntry[]).sort((a, b) => a.priority - b.priority);
  } catch (error) {
    logger.warn("failed to read supplier provider keys", {
      provider,
      error: safeErrorMessage(error, "read failed"),
    });
    return [];
  }
}

export async function getSupplierProviderPoolKeys(provider: string): Promise<SupplierProviderKeyEntry[]> {
  const keys = await getSupplierProviderKeys(provider);
  return keys
    .filter(isUsableSupplierProviderKey)
    .sort((a, b) => a.priority - b.priority);
}

async function updateSupplierProviderKey(
  provider: string,
  keyId: string,
  mapper: (entry: SupplierProviderKeyEntry) => SupplierProviderKeyEntry
): Promise<void> {
  const db = await getAdminDB();
  if (!db) return;
  const docRef = db.collection(COLLECTION).doc(DOC_ID);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const data = (snap.data() || {}) as Record<string, unknown>;
    const keys = (Array.isArray(data[provider]) ? data[provider] : []) as SupplierProviderKeyEntry[];
    if (!keys.some((k) => k.id === keyId)) return;
    tx.update(docRef, {
      [provider]: keys.map((k) => (k.id === keyId ? mapper(k) : k)),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function bestEffort(action: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    logger.warn("supplier provider key bookkeeping failed", {
      action,
      error: safeErrorMessage(error, "write failed"),
    });
  }
}

export async function recordSupplierProviderKeySuccess(provider: string, keyId: string): Promise<void> {
  await bestEffort("record_success", () =>
    updateSupplierProviderKey(provider, keyId, (entry) => ({
      ...entry,
      requestsUsed: entry.requestsUsed + 1,
      lastStatus: "healthy",
      lastError: null,
    }))
  );
}

export async function recordSupplierProviderKeyFailure(
  provider: string,
  keyId: string,
  message: string
): Promise<void> {
  await bestEffort("record_failure", () =>
    updateSupplierProviderKey(provider, keyId, (entry) => ({
      ...entry,
      lastStatus: "error",
      lastError: message.slice(0, 500),
    }))
  );
}

export async function setSupplierProviderKeyResult(
  provider: string,
  keyId: string,
  success: boolean,
  message: string
): Promise<void> {
  await updateSupplierProviderKey(provider, keyId, (entry) =>
    success
      ? { ...entry, lastStatus: "healthy", lastError: null }
      : { ...entry, lastStatus: "error", lastError: message.slice(0, 500) }
  );
}
