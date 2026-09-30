import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockAdminDB, installDocStoreTransactions } from "@/__tests__/test-utils";
import {
  getSupplierProviderKeys,
  getSupplierProviderPoolKeys,
  isUsableSupplierProviderKey,
  recordSupplierProviderKeySuccess,
  recordSupplierProviderKeyFailure,
  setSupplierProviderKeyResult,
  type SupplierProviderKeyEntry,
} from "./supplier-provider-keys";
import { getAdminDB } from "@/lib/firebase-admin";

function keyEntry(overrides: Partial<SupplierProviderKeyEntry> = {}): SupplierProviderKeyEntry {
  return {
    id: "skey_1",
    key: "scraper-key-abc",
    label: "Primary",
    priority: 1,
    requestsUsed: 0,
    requestsLimit: 1000,
    resetDate: "2026-10-01",
    lastError: null,
    lastStatus: "untested",
    ...overrides,
  };
}

async function seedKeys(db: ReturnType<typeof createMockAdminDB>, provider: string, keys: SupplierProviderKeyEntry[]): Promise<void> {
  await db.collection("system").doc("supplierProviderKeys").set({ [provider]: keys });
}

async function readKeys(db: ReturnType<typeof createMockAdminDB>, provider: string): Promise<SupplierProviderKeyEntry[]> {
  const doc = await db.collection("system").doc("supplierProviderKeys").get();
  const data = doc.exists ? doc.data() : {};
  return ((data as Record<string, unknown>)[provider] as SupplierProviderKeyEntry[]) || [];
}

describe("supplier-provider-keys", () => {
  let mockDB: ReturnType<typeof createMockAdminDB>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDB = createMockAdminDB();
    installDocStoreTransactions(mockDB);
    vi.mocked(getAdminDB).mockResolvedValue(mockDB as never);
  });

  afterEach(() => {
    vi.mocked(getAdminDB).mockReset();
  });

  describe("isUsableSupplierProviderKey", () => {
    it("rejects empty, errored and quota-exhausted keys", () => {
      expect(isUsableSupplierProviderKey(keyEntry())).toBe(true);
      expect(isUsableSupplierProviderKey(keyEntry({ key: "" }))).toBe(false);
      expect(isUsableSupplierProviderKey(keyEntry({ lastStatus: "error" }))).toBe(false);
      expect(isUsableSupplierProviderKey(keyEntry({ requestsUsed: 1000, requestsLimit: 1000 }))).toBe(false);
      expect(isUsableSupplierProviderKey(keyEntry({ requestsUsed: 10, requestsLimit: 0 }))).toBe(true);
    });
  });

  describe("getSupplierProviderKeys", () => {
    it("returns keys sorted by priority", async () => {
      await seedKeys(mockDB, "scraperapi", [
        keyEntry({ id: "b", priority: 2 }),
        keyEntry({ id: "a", priority: 1 }),
      ]);
      const keys = await getSupplierProviderKeys("scraperapi");
      expect(keys.map((k) => k.id)).toEqual(["a", "b"]);
    });

    it("returns an empty list when the provider has no keys", async () => {
      await seedKeys(mockDB, "scraperapi", [keyEntry()]);
      expect(await getSupplierProviderKeys("serpapi")).toEqual([]);
    });

    it("returns an empty list when there is no admin database", async () => {
      vi.mocked(getAdminDB).mockResolvedValue(undefined as never);
      expect(await getSupplierProviderKeys("scraperapi")).toEqual([]);
    });

    it("swallows read failures instead of breaking searches", async () => {
      vi.mocked(getAdminDB).mockRejectedValue(new Error("firestore down") as never);
      expect(await getSupplierProviderKeys("scraperapi")).toEqual([]);
    });
  });

  describe("getSupplierProviderPoolKeys", () => {
    it("filters unusable keys and keeps priority order", async () => {
      await seedKeys(mockDB, "scraperapi", [
        keyEntry({ id: "errored", priority: 1, lastStatus: "error" }),
        keyEntry({ id: "exhausted", priority: 2, requestsUsed: 1000, requestsLimit: 1000 }),
        keyEntry({ id: "full", priority: 4 }),
        keyEntry({ id: "ready", priority: 3 }),
      ]);
      const pool = await getSupplierProviderPoolKeys("scraperapi");
      expect(pool.map((k) => k.id)).toEqual(["ready", "full"]);
    });
  });

  describe("setSupplierProviderKeyResult", () => {
    it("marks a key healthy and clears the last error on success", async () => {
      await seedKeys(mockDB, "scraperapi", [keyEntry({ lastStatus: "error", lastError: "old" })]);
      await setSupplierProviderKeyResult("scraperapi", "skey_1", true, "ScraperAPI connection successful");
      const keys = await readKeys(mockDB, "scraperapi");
      expect(keys[0].lastStatus).toBe("healthy");
      expect(keys[0].lastError).toBeNull();
    });

    it("marks a key errored with the sliced message on failure", async () => {
      await seedKeys(mockDB, "scraperapi", [keyEntry()]);
      await setSupplierProviderKeyResult("scraperapi", "skey_1", false, "x".repeat(600));
      const keys = await readKeys(mockDB, "scraperapi");
      expect(keys[0].lastStatus).toBe("error");
      expect(keys[0].lastError).toHaveLength(500);
    });

    it("does not write when the key id is unknown", async () => {
      await seedKeys(mockDB, "scraperapi", [keyEntry()]);
      await setSupplierProviderKeyResult("scraperapi", "missing_key", false, "nope");
      const update = vi.mocked(mockDB.runTransaction);
      const keys = await readKeys(mockDB, "scraperapi");
      expect(keys[0].lastStatus).toBe("untested");
      expect(update).toHaveBeenCalled();
    });
  });

  describe("recordSupplierProviderKeySuccess and recordSupplierProviderKeyFailure", () => {
    it("increments usage and marks the key healthy on success", async () => {
      await seedKeys(mockDB, "scraperapi", [keyEntry({ requestsUsed: 4 })]);
      await recordSupplierProviderKeySuccess("scraperapi", "skey_1");
      const keys = await readKeys(mockDB, "scraperapi");
      expect(keys[0].requestsUsed).toBe(5);
      expect(keys[0].lastStatus).toBe("healthy");
    });

    it("marks the key errored on failure without throwing", async () => {
      await seedKeys(mockDB, "scraperapi", [keyEntry()]);
      await recordSupplierProviderKeyFailure("scraperapi", "skey_1", "ScraperAPI 429: rate limited");
      const keys = await readKeys(mockDB, "scraperapi");
      expect(keys[0].lastStatus).toBe("error");
      expect(keys[0].lastError).toBe("ScraperAPI 429: rate limited");
    });

    it("does not throw when Firestore writes fail", async () => {
      await seedKeys(mockDB, "scraperapi", [keyEntry()]);
      vi.mocked(mockDB.runTransaction).mockRejectedValue(new Error("write failed") as never);
      await expect(recordSupplierProviderKeySuccess("scraperapi", "skey_1")).resolves.toBeUndefined();
      await expect(recordSupplierProviderKeyFailure("scraperapi", "skey_1", "err")).resolves.toBeUndefined();
    });

    it("does nothing when there is no admin database", async () => {
      vi.mocked(getAdminDB).mockResolvedValue(undefined as never);
      await expect(recordSupplierProviderKeySuccess("scraperapi", "skey_1")).resolves.toBeUndefined();
      await expect(recordSupplierProviderKeyFailure("scraperapi", "skey_1", "err")).resolves.toBeUndefined();
      await expect(setSupplierProviderKeyResult("scraperapi", "skey_1", true, "ok")).resolves.toBeUndefined();
    });
  });
});
