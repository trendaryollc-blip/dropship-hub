import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

import { logAuditEvent, getAuditLogs, getAuditLogCount, clearAuditLogs, getAuditStats } from "@/lib/fulfillment/audit-logger";
import { getAdminDB } from "@/lib/firebase-admin";

function createInMemoryFirestore() {
  const store = new Map<string, Record<string, unknown>>();

  function createDocRef(path: string) {
    const docRef: Record<string, unknown> = {
      id: path.split("/").pop() || "unknown",
      set: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
        store.set(path, { ...data });
      }),
      get: vi.fn().mockImplementation(async () => {
        const data = store.get(path);
        return {
          exists: !!data,
          data: () => data || null,
          id: path.split("/").pop(),
          ref: docRef,
        };
      }),
      update: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
        const existing = store.get(path) || {};
        store.set(path, { ...existing, ...data });
      }),
      delete: vi.fn().mockImplementation(async () => {
        store.delete(path);
      }),
    };
    docRef.ref = docRef;
    return docRef;
  }

  function createQueryCollection(parentPath: string) {
    let _whereClauses: Array<{ field: string; op: string; value: unknown }> = [];
    let _orderByField: string | null = null;
    let _orderByDir: "asc" | "desc" = "asc";
    let _limitN: number | null = null;
    let _startAfterDoc: unknown = null;

    function getFilteredDocs() {
      let docs = Array.from(store.entries())
        .filter(([path]) => path.startsWith(parentPath + "/"))
        .map(([path, data]) => ({
          id: path.split("/").pop()!,
          data: () => data,
          ref: { id: path.split("/").pop()!, _path: path },
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

      if (_startAfterDoc) {
        const idx = docs.findIndex((d) => d.id === (_startAfterDoc as { id: string }).id);
        if (idx >= 0) docs = docs.slice(idx + 1);
      }

      if (_limitN !== null) {
        docs = docs.slice(0, _limitN);
      }

      return docs;
    }

    const collection: Record<string, unknown> = {
      doc: vi.fn((idOrData?: string) => {
        const id = typeof idOrData === "string" ? idOrData : store.size.toString();
        const docPath = `${parentPath}/${id}`;
        store.set(docPath, store.get(docPath) || {});
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
      startAfter: vi.fn().mockImplementation((docSnap: unknown) => {
        _startAfterDoc = docSnap;
        return collection;
      }),
      get: vi.fn().mockImplementation(async () => {
        const docs = getFilteredDocs();
        return { docs, size: docs.length, empty: docs.length === 0 };
      }),
      count: vi.fn().mockReturnValue({
        get: vi.fn().mockImplementation(async () => {
          const docs = getFilteredDocs();
          return { data: () => ({ count: docs.length }) };
        }),
      }),
      add: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
        const id = `auto_${Date.now()}`;
        const docPath = `${parentPath}/${id}`;
        store.set(docPath, data);
        return { id };
      }),
      _reset: () => {
        _whereClauses = [];
        _orderByField = null;
        _orderByDir = "asc";
        _limitN = null;
        _startAfterDoc = null;
      },
    };
    return collection;
  }

  const batchOps: Array<{ type: string; path: string }> = [];
  const batch = {
    set: vi.fn().mockImplementation((_ref: { _path: string }, _data: unknown) => {
      batchOps.push({ type: "set", path: (_ref as unknown as { _path: string })._path });
    }),
    update: vi.fn(),
    delete: vi.fn().mockImplementation((_docRef: { _path: string }) => {
      batchOps.push({ type: "delete", path: _docRef._path });
    }),
    commit: vi.fn().mockImplementation(async () => {
      for (const op of batchOps) {
        if (op.type === "delete") store.delete(op.path);
      }
      batchOps.length = 0;
    }),
  };

  const db = {
    collection: vi.fn().mockImplementation((_name: string) => {
      return {
        doc: vi.fn().mockImplementation((_uid: string) => {
          return {
            collection: vi.fn().mockImplementation((_subName: string) => {
              const col = createQueryCollection(`${_name}/${_uid}/${_subName}`);
              return col;
            }),
          };
        }),
      };
    }),
    batch: vi.fn().mockReturnValue(batch),
    _store: store,
  };

  return db;
}

describe("Audit Logger", () => {
  let mockDb: ReturnType<typeof createInMemoryFirestore>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDb = createInMemoryFirestore();
    vi.mocked(getAdminDB).mockResolvedValue(mockDb as never);
  });

  it("logs an audit event", async () => {
    const entry = await logAuditEvent("test_user", {
      orderId: "order_1",
      action: "order_detected",
      details: "Order detected via webhook",
    });
    expect(entry.id).toBeDefined();
    expect(entry.orderId).toBe("order_1");
    expect(entry.action).toBe("order_detected");
    expect(entry.timestamp).toBeDefined();
  });

  it("retrieves logs for user", async () => {
    await logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    await logAuditEvent("test_user", { orderId: "order_2", action: "order_routed", details: "test" });
    const logs = await getAuditLogs("test_user");
    expect(logs.length).toBe(2);
  });

  it("filters logs by orderId", async () => {
    await logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    await logAuditEvent("test_user", { orderId: "order_2", action: "order_routed", details: "test" });
    const logs = await getAuditLogs("test_user", { orderId: "order_1" });
    expect(logs.length).toBe(1);
    expect(logs[0].orderId).toBe("order_1");
  });

  it("filters logs by action", async () => {
    await logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    await logAuditEvent("test_user", { orderId: "order_1", action: "order_routed", details: "test" });
    const logs = await getAuditLogs("test_user", { action: "order_detected" });
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe("order_detected");
  });

  it("respects limit and offset", async () => {
    for (let i = 0; i < 10; i++) {
      await logAuditEvent("test_user", { orderId: `order_${i}`, action: "order_detected", details: "test" });
    }
    const logs = await getAuditLogs("test_user", { limit: 3, offset: 2 });
    expect(logs.length).toBe(3);
  });

  it("counts logs correctly", async () => {
    await logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    await logAuditEvent("test_user", { orderId: "order_1", action: "order_routed", details: "test" });
    expect(await getAuditLogCount("test_user")).toBe(2);
    expect(await getAuditLogCount("test_user", "order_1")).toBe(2);
  });

  it("clears all logs", async () => {
    await logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    const cleared = await clearAuditLogs("test_user");
    expect(cleared).toBe(1);
    expect((await getAuditLogs("test_user")).length).toBe(0);
  });

  it("clears logs for specific order", async () => {
    await logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    await logAuditEvent("test_user", { orderId: "order_2", action: "order_detected", details: "test" });
    const cleared = await clearAuditLogs("test_user", "order_1");
    expect(cleared).toBe(1);
    expect((await getAuditLogs("test_user")).length).toBe(1);
  });

  it("stores metadata", async () => {
    const entry = await logAuditEvent("test_user", {
      orderId: "order_1",
      action: "order_placed",
      details: "CJ order placed",
      metadata: { cjOrderNumber: "CJ123", totalCost: 15.99 },
    });
    expect(entry.metadata.cjOrderNumber).toBe("CJ123");
    expect(entry.metadata.totalCost).toBe(15.99);
  });

  it("returns stats", async () => {
    await logAuditEvent("test_user", { orderId: "order_1", action: "order_detected", details: "test" });
    await logAuditEvent("test_user", { orderId: "order_1", action: "order_failed", details: "test" });
    const stats = await getAuditStats("test_user");
    expect(stats.totalEvents).toBe(2);
    expect(stats.ordersProcessed).toBe(1);
    expect(stats.eventsByAction["order_detected"]).toBe(1);
    expect(stats.recentErrors.length).toBe(1);
  });

  it("isolates logs between users", async () => {
    await logAuditEvent("user_1", { orderId: "order_1", action: "order_detected", details: "test" });
    await logAuditEvent("user_2", { orderId: "order_2", action: "order_detected", details: "test" });
    expect((await getAuditLogs("user_1")).length).toBe(1);
    expect((await getAuditLogs("user_2")).length).toBe(1);
  });

  it("limits stored logs to 1000", async () => {
    for (let i = 0; i < 1100; i++) {
      await logAuditEvent("test_user", { orderId: `order_${i}`, action: "order_detected", details: "test" });
    }
    expect(await getAuditLogCount("test_user")).toBe(1000);
  });
});
