import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

import {
  createBulkOperation,
  processBulkResult,
  startBulkOperation,
  getBulkOperation,
  cancelBulkOperation,
  validateBulkInput,
  clearOldOperations,
  clearAllOperations,
  getBulkOperationHistory,
} from "@/lib/fulfillment/bulk-processor";
import { getAdminDB } from "@/lib/firebase-admin";

function createInMemoryFirestore() {
  const store = new Map<string, Record<string, unknown>>();

  function createDocRef(path: string) {
    return {
      id: path.split("/").pop() || "unknown",
      set: vi.fn().mockImplementation(async (data: Record<string, unknown>, _opts?: { merge?: boolean }) => {
        store.set(path, { ...data });
      }),
      get: vi.fn().mockImplementation(async () => {
        const data = store.get(path);
        return { exists: !!data, data: () => data || null, id: path.split("/").pop() };
      }),
      update: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
        const existing = store.get(path) || {};
        store.set(path, { ...existing, ...data });
      }),
      delete: vi.fn().mockImplementation(async () => {
        store.delete(path);
      }),
    };
  }

  function createCollection(parentPath: string) {
    let _whereClauses: Array<{ field: string; op: string; value: unknown }> = [];
    let _orderByField: string | null = null;
    let _orderByDir: "asc" | "desc" = "asc";
    let _limitN: number | null = null;

    function getFilteredDocs() {
      let docs = Array.from(store.entries())
        .filter(([path]) => path.startsWith(parentPath + "/"))
        .map(([path, data]) => ({
          id: path.split("/").pop()!,
          data: () => data,
          ref: createDocRef(path),
        }));

      for (const clause of _whereClauses) {
        docs = docs.filter((d) => {
          const val = (d.data() as Record<string, unknown>)[clause.field];
          if (clause.op === "==") return val === clause.value;
          if (clause.op === "<") return val < clause.value;
          if (clause.op === ">") return val > clause.value;
          if (clause.op === "in") return (clause.value as unknown[]).includes(val);
          return true;
        });
      }

      if (_orderByField) {
        docs.sort((a, b) => {
          const aVal = (a.data() as Record<string, unknown>)[_orderByField!] as string;
          const bVal = (b.data() as Record<string, unknown>)[_orderByField!] as string;
          const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return _orderByDir === "desc" ? -cmp : cmp;
        });
      }

      if (_limitN !== null) docs = docs.slice(0, _limitN);
      return docs;
    }

    const collection: Record<string, unknown> = {
      doc: vi.fn((id?: string) => {
        const docId = id || `auto_${store.size}`;
        const docPath = `${parentPath}/${docId}`;
        return createDocRef(docPath);
      }),
      where: vi.fn().mockImplementation((field: string, op: string, value: unknown) => {
        _whereClauses.push({ field, op, value });
        return collection;
      }),
      orderBy: vi.fn().mockImplementation((field: string, dir: "asc" | "desc" = "asc") => {
        _orderByField = field;
        _orderByDir = dir;
        return collection;
      }),
      limit: vi.fn().mockImplementation((n: number) => {
        _limitN = n;
        return collection;
      }),
      get: vi.fn().mockImplementation(async () => {
        const docs = getFilteredDocs();
        _whereClauses = [];
        _orderByField = null;
        _limitN = null;
        return { docs, size: docs.length, empty: docs.length === 0 };
      }),
    };
    return collection;
  }

  const batch = {
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  const db = {
    collection: vi.fn().mockImplementation((_name: string) => ({
      doc: vi.fn().mockImplementation((_id: string) => ({
        collection: vi.fn().mockImplementation((_subName: string) =>
          createCollection(`${_name}/${_id}/${_subName}`)
        ),
      })),
    })),
    batch: vi.fn().mockReturnValue(batch),
    _store: store,
  };

  return db;
}

describe("Bulk Processor", () => {
  let mockDb: ReturnType<typeof createInMemoryFirestore>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDb = createInMemoryFirestore();
    vi.mocked(getAdminDB).mockResolvedValue(mockDb as never);
    await clearAllOperations();
  });

  describe("validateBulkInput", () => {
    it("validates correct input", () => {
      const result = validateBulkInput({
        orderIds: ["order_1", "order_2"],
        action: "fulfill",
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("rejects empty orderIds", () => {
      const result = validateBulkInput({ orderIds: [], action: "fulfill" });
      expect(result.valid).toBe(false);
    });

    it("rejects more than 50 orders", () => {
      const ids = Array.from({ length: 51 }, (_, i) => `order_${i}`);
      const result = validateBulkInput({ orderIds: ids, action: "fulfill" });
      expect(result.valid).toBe(false);
    });

    it("rejects duplicate order IDs", () => {
      const result = validateBulkInput({
        orderIds: ["order_1", "order_1"],
        action: "fulfill",
      });
      expect(result.valid).toBe(false);
    });

    it("rejects invalid action", () => {
      const result = validateBulkInput({
        orderIds: ["order_1"],
        action: "invalid" as "fulfill",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("createBulkOperation", () => {
    it("creates operation with correct defaults", async () => {
      const op = await createBulkOperation({
        orderIds: ["order_1", "order_2"],
        action: "fulfill",
      });
      expect(op.id).toBeDefined();
      expect(op.totalOrders).toBe(2);
      expect(op.status).toBe("pending");
      expect(op.processedOrders).toBe(0);
    });
  });

  describe("processBulkResult", () => {
    it("tracks successful results", async () => {
      const op = await createBulkOperation({
        orderIds: ["order_1", "order_2"],
        action: "fulfill",
      });
      await startBulkOperation(op.id);
      await processBulkResult(op.id, { orderId: "order_1", success: true });
      await processBulkResult(op.id, { orderId: "order_2", success: true });

      const final = await getBulkOperation(op.id);
      expect(final!.successfulOrders).toBe(2);
      expect(final!.status).toBe("completed");
      expect(final!.completedAt).toBeDefined();
    });

    it("tracks failed results", async () => {
      const op = await createBulkOperation({
        orderIds: ["order_1", "order_2"],
        action: "fulfill",
      });
      await startBulkOperation(op.id);
      await processBulkResult(op.id, { orderId: "order_1", success: true });
      await processBulkResult(op.id, { orderId: "order_2", success: false, error: "Not found" });

      const final = await getBulkOperation(op.id);
      expect(final!.failedOrders).toBe(1);
      expect(final!.errors.length).toBe(1);
      expect(final!.status).toBe("partial");
    });

    it("marks as failed when all fail", async () => {
      const op = await createBulkOperation({ orderIds: ["order_1"], action: "fulfill" });
      await startBulkOperation(op.id);
      await processBulkResult(op.id, { orderId: "order_1", success: false, error: "Failed" });

      const final = await getBulkOperation(op.id);
      expect(final!.status).toBe("failed");
    });
  });

  describe("cancelBulkOperation", () => {
    it("cancels pending operation", async () => {
      const op = await createBulkOperation({ orderIds: ["order_1"], action: "fulfill" });
      const cancelled = await cancelBulkOperation(op.id);
      expect(cancelled).toBe(true);
      expect((await getBulkOperation(op.id))!.status).toBe("failed");
    });

    it("cannot cancel completed operation", async () => {
      const op = await createBulkOperation({ orderIds: ["order_1"], action: "fulfill" });
      await startBulkOperation(op.id);
      await processBulkResult(op.id, { orderId: "order_1", success: true });
      const cancelled = await cancelBulkOperation(op.id);
      expect(cancelled).toBe(false);
    });

    it("returns false for non-existent operation", async () => {
      expect(await cancelBulkOperation("nonexistent")).toBe(false);
    });
  });

  describe("clearOldOperations", () => {
    it("clears old completed operations", async () => {
      const op = await createBulkOperation({ orderIds: ["order_1"], action: "fulfill" });
      await startBulkOperation(op.id);
      await processBulkResult(op.id, { orderId: "order_1", success: true });

      const cleared = await clearOldOperations(-1);
      expect(cleared).toBe(1);
    });
  });

  describe("getBulkOperationHistory", () => {
    it("returns recent operations", async () => {
      await createBulkOperation({ orderIds: ["order_1"], action: "fulfill" });
      await createBulkOperation({ orderIds: ["order_2"], action: "cancel" });
      const history = await getBulkOperationHistory(10);
      expect(history.length).toBe(2);
    });
  });
});
