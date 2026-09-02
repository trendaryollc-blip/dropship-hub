import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAdminDB } from "./firebase-admin";
import {
  getAllPlatforms,
  getPlatform,
  createPlatform,
  updatePlatform,
  deletePlatform,
  addPlatformKey,
  removePlatformKey,
  updatePlatformKey,
  reorderPlatformKeys,
  incrementKeyUsage,
  markKeyError,
  markKeyHealthy,
  setPlatformCooldown,
  resetKeyUsage,
} from "./platform-config";

vi.mock("./firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
    increment: vi.fn((n: number) => ({ _increment: n })),
  },
}));

vi.mock("./data/schemas", () => ({
  PlatformFirestoreConfigSchema: {
    parse: vi.fn((data) => data),
  },
}));

function makeMockDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data, exists: true };
}

function makeMockCollection(docs: ReturnType<typeof makeMockDoc>[] = []) {
  return {
    orderBy: vi.fn().mockReturnThis(),
    doc: vi.fn((id: string) => {
      const doc = docs.find((d) => d.id === id);
      return {
        get: vi.fn().mockResolvedValue(doc || { id, data: () => ({}), exists: false }),
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      };
    }),
    get: vi.fn().mockResolvedValue({ docs }),
  };
}

function makeMockFirestore(collectionDocs: ReturnType<typeof makeMockDoc>[] = []) {
  const collection = makeMockCollection(collectionDocs);
  return {
    collection: vi.fn().mockReturnValue(collection),
    runTransaction: vi.fn(async (fn: (tx: { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }) => Promise<unknown>) => {
      const tx = {
        get: vi.fn().mockResolvedValue(collectionDocs[0] || { id: "p1", data: () => ({ keys: [] }), exists: true }),
        update: vi.fn().mockResolvedValue(undefined),
      };
      await fn(tx);
    }),
  };
}

describe("platform-config CRUD operations", () => {
  let mockFirestore: ReturnType<typeof makeMockFirestore>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestore = makeMockFirestore([]);
    vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);
  });

  describe("getAllPlatforms", () => {
    it("returns all platforms from Firestore", async () => {
      const docs = [
        makeMockDoc("amazon", { id: "amazon", name: "Amazon", enabled: true, keys: [], lastHealth: "healthy", method: "rainforest" }),
      ];
      mockFirestore = makeMockFirestore(docs);
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      const result = await getAllPlatforms();
      expect(result).toHaveLength(1);
      expect(mockFirestore.collection).toHaveBeenCalledWith("platforms");
    });
  });

  describe("getPlatform", () => {
    it("returns a platform by id", async () => {
      const docs = [
        makeMockDoc("amazon", { id: "amazon", name: "Amazon", enabled: true, keys: [], lastHealth: "healthy", method: "rainforest" }),
      ];
      mockFirestore = makeMockFirestore(docs);
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      const result = await getPlatform("amazon");
      expect(result).toBeTruthy();
    });

    it("returns null for non-existent platform", async () => {
      const mockCollection = makeMockCollection([]);
      mockCollection.doc.mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      });
      mockFirestore.collection = vi.fn().mockReturnValue(mockCollection);
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      const result = await getPlatform("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("createPlatform", () => {
    it("creates a platform with auto-generated id from name", async () => {
      const mockCollection = makeMockCollection([]);
      mockCollection.doc.mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn(),
        delete: vi.fn(),
      });
      mockFirestore.collection = vi.fn().mockReturnValue(mockCollection);
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      const result = await createPlatform({ name: "My Platform", method: "rainforest" });
      expect(result.name).toBe("My Platform");
      expect(result.id).toMatch(/^my_platform$/);
      expect(result.enabled).toBe(true);
      expect(result.keys).toEqual([]);
    });

    it("creates a platform with slug id", async () => {
      const mockCollection = makeMockCollection([]);
      mockCollection.doc.mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn(),
        delete: vi.fn(),
      });
      mockFirestore.collection = vi.fn().mockReturnValue(mockCollection);
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      const result = await createPlatform({ name: "Custom", slug: "custom-slug", method: "serpapi" });
      expect(result.id).toBe("custom-slug");
    });

    it("creates platform with API key", async () => {
      const mockCollection = makeMockCollection([]);
      mockCollection.doc.mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn(),
        delete: vi.fn(),
      });
      mockFirestore.collection = vi.fn().mockReturnValue(mockCollection);
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      const result = await createPlatform({
        name: "WithKey",
        method: "rainforest",
        apiKey: "test-key-123",
        keyLabel: "Primary",
        requestsLimit: 200,
      });
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0].key).toBe("test-key-123");
      expect(result.keys[0].label).toBe("Primary");
      expect(result.keys[0].requestsLimit).toBe(200);
      expect(result.keys[0].priority).toBe(1);
      expect(result.keys[0].lastStatus).toBe("untested");
    });

    it("creates platform without API key", async () => {
      const mockCollection = makeMockCollection([]);
      mockCollection.doc.mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn(),
        delete: vi.fn(),
      });
      mockFirestore.collection = vi.fn().mockReturnValue(mockCollection);
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      const result = await createPlatform({ name: "NoKey", method: "serpapi" });
      expect(result.keys).toEqual([]);
    });
  });

  describe("updatePlatform", () => {
    it("updates platform fields", async () => {
      const mockCollection = makeMockCollection([]);
      mockCollection.doc.mockReturnValue({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn(),
      });
      mockFirestore.collection = vi.fn().mockReturnValue(mockCollection);
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await updatePlatform("amazon", { name: "Amazon Updated" });
      const docRef = mockCollection.doc("amazon");
      expect(docRef.update).toHaveBeenCalled();
    });
  });

  describe("deletePlatform", () => {
    it("deletes a platform", async () => {
      const mockCollection = makeMockCollection([]);
      mockCollection.doc.mockReturnValue({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue(undefined),
      });
      mockFirestore.collection = vi.fn().mockReturnValue(mockCollection);
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await deletePlatform("amazon");
      const docRef = mockCollection.doc("amazon");
      expect(docRef.delete).toHaveBeenCalled();
    });
  });
});

describe("platform-config key management", () => {
  let mockFirestore: ReturnType<typeof makeMockFirestore>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addPlatformKey", () => {
    it("adds a key to an existing platform", async () => {
      const existingPlatform = {
        keys: [
          { id: "k1", priority: 1, key: "existing", label: "Old", requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" },
        ],
      };
      const txUpdate = vi.fn();
      const _mockCollection = makeMockCollection([]);
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: true, data: () => existingPlatform }),
          update: txUpdate,
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await addPlatformKey("amazon", "new-key", "Secondary", 200, "2099-06-01");

      expect(txUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          keys: expect.arrayContaining([
            expect.objectContaining({ key: "existing", priority: 1 }),
            expect.objectContaining({ key: "new-key", label: "Secondary", priority: 2, requestsLimit: 200 }),
          ]),
        })
      );
    });

    it("throws when platform not found", async () => {
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: false }),
          update: vi.fn(),
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await expect(addPlatformKey("nonexistent", "k", "L", 100, "2099-01-01")).rejects.toThrow("Platform not found");
    });
  });

  describe("removePlatformKey", () => {
    it("removes a key and reassigns priorities", async () => {
      const existingPlatform = {
        keys: [
          { id: "k1", priority: 1 },
          { id: "k2", priority: 2 },
          { id: "k3", priority: 3 },
        ],
      };
      const txUpdate = vi.fn();
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: true, data: () => existingPlatform }),
          update: txUpdate,
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await removePlatformKey("amazon", "k2");

      expect(txUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          keys: [
            { id: "k1", priority: 1 },
            { id: "k3", priority: 2 },
          ],
        })
      );
    });
  });

  describe("updatePlatformKey", () => {
    it("updates specific key fields", async () => {
      const existingPlatform = {
        keys: [
          { id: "k1", key: "old", label: "Old", requestsLimit: 100, resetDate: "2099-01-01" },
        ],
      };
      const txUpdate = vi.fn();
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: true, data: () => existingPlatform }),
          update: txUpdate,
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await updatePlatformKey("amazon", "k1", { key: "new", label: "New" });

      expect(txUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          keys: expect.arrayContaining([
            expect.objectContaining({ id: "k1", key: "new", label: "New" }),
          ]),
        })
      );
    });
  });

  describe("reorderPlatformKeys", () => {
    it("reorders keys based on provided order", async () => {
      const existingPlatform = {
        keys: [
          { id: "k1", priority: 1 },
          { id: "k2", priority: 2 },
        ],
      };
      const txUpdate = vi.fn();
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: true, data: () => existingPlatform }),
          update: txUpdate,
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await reorderPlatformKeys("amazon", ["k2", "k1"]);

      expect(txUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          keys: [
            { id: "k2", priority: 1 },
            { id: "k1", priority: 2 },
          ],
        })
      );
    });

    it("throws when key not found in platform", async () => {
      const existingPlatform = {
        keys: [{ id: "k1", priority: 1 }],
      };
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: true, data: () => existingPlatform }),
          update: vi.fn(),
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await expect(reorderPlatformKeys("amazon", ["k99"])).rejects.toThrow("Key k99 not found");
    });
  });

  describe("incrementKeyUsage", () => {
    it("increments requestsUsed for the key", async () => {
      const existingPlatform = {
        keys: [{ id: "k1", requestsUsed: 5 }],
      };
      const txUpdate = vi.fn();
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: true, data: () => existingPlatform }),
          update: txUpdate,
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await incrementKeyUsage("amazon", "k1");

      expect(txUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          keys: expect.arrayContaining([
            expect.objectContaining({ id: "k1", requestsUsed: 6 }),
          ]),
        })
      );
    });
  });

  describe("markKeyError", () => {
    it("marks key with error status", async () => {
      const existingPlatform = {
        keys: [{ id: "k1", lastError: null, lastStatus: "untested" }],
      };
      const txUpdate = vi.fn();
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: true, data: () => existingPlatform }),
          update: txUpdate,
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await markKeyError("amazon", "k1", "Rate limited");

      expect(txUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          keys: expect.arrayContaining([
            expect.objectContaining({ id: "k1", lastError: "Rate limited", lastStatus: "error" }),
          ]),
        })
      );
    });
  });

  describe("markKeyHealthy", () => {
    it("marks key as healthy and clears cooldown", async () => {
      const existingPlatform = {
        keys: [{ id: "k1", lastError: "some error", lastStatus: "error", lastTested: null }],
      };
      const txUpdate = vi.fn();
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: true, data: () => existingPlatform }),
          update: txUpdate,
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await markKeyHealthy("amazon", "k1");

      expect(txUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          keys: expect.arrayContaining([
            expect.objectContaining({ id: "k1", lastError: null, lastStatus: "healthy" }),
          ]),
          lastHealth: "healthy",
          lastError: null,
          cooldownUntil: null,
        })
      );
    });
  });

  describe("setPlatformCooldown", () => {
    it("sets cooldown until specified minutes from now", async () => {
      const txUpdate = vi.fn();
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
          update: txUpdate,
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      const before = Date.now();
      await setPlatformCooldown("amazon", 5);
      const after = Date.now();

      expect(txUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastHealth: "error",
          cooldownUntil: expect.any(Date),
        })
      );
      const cooldown = txUpdate.mock.calls[0][1].cooldownUntil as Date;
      expect(cooldown.getTime()).toBeGreaterThanOrEqual(before + 5 * 60 * 1000 - 1000);
      expect(cooldown.getTime()).toBeLessThanOrEqual(after + 5 * 60 * 1000 + 1000);
    });

    it("throws when platform not found", async () => {
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: false }),
          update: vi.fn(),
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await expect(setPlatformCooldown("nonexistent", 5)).rejects.toThrow("Platform not found");
    });
  });

  describe("resetKeyUsage", () => {
    it("resets requestsUsed to 0 and clears error", async () => {
      const existingPlatform = {
        keys: [{ id: "k1", requestsUsed: 50, lastError: "error", lastStatus: "error" }],
      };
      const txUpdate = vi.fn();
      mockFirestore = makeMockFirestore([]);
      mockFirestore.runTransaction = vi.fn(async (fn) => {
        const tx = {
          get: vi.fn().mockResolvedValue({ exists: true, data: () => existingPlatform }),
          update: txUpdate,
        };
        await fn(tx);
      });
      vi.mocked(getAdminDB).mockResolvedValue(mockFirestore as never);

      await resetKeyUsage("amazon", "k1");

      expect(txUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          keys: expect.arrayContaining([
            expect.objectContaining({ id: "k1", requestsUsed: 0, lastError: null, lastStatus: "untested" }),
          ]),
        })
      );
    });
  });
});
