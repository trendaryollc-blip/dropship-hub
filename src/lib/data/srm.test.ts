import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("@/lib/data/utils", () => ({
  handleFirestoreError: vi.fn(),
}));

import {
  getSupplierMessages,
  addSupplierMessage,
  markMessageRead,
  deleteSupplierMessage,
  getNegotiations,
  addNegotiation,
  updateNegotiation,
  getSupplierScorecards,
  saveSupplierScorecard,
  getAutoSwitchRules,
  addAutoSwitchRule,
  updateAutoSwitchRule,
  deleteAutoSwitchRule,
  getSupplierSwitchLogs,
  addSupplierSwitchLog,
} from "@/lib/data/srm";
import { getAdminDB } from "@/lib/firebase-admin";

function createInMemoryFirestore() {
  const store = new Map<string, Record<string, unknown>>();

  function createDocRef(path: string) {
    return {
      id: path.split("/").pop() || "unknown",
      set: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
        store.set(path, { ...data });
      }),
      get: vi.fn().mockImplementation(async () => {
        const data = store.get(path);
        return { exists: !!data, data: () => data || null, id: path.split("/").pop() };
      }),
      delete: vi.fn().mockImplementation(async () => {
        store.delete(path);
      }),
    };
  }

  function createCollection(parentPath: string) {
    let _whereClauses: Array<{ field: string; op: string; value: unknown }> = [];
    let _orderByField: string | null = null;
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
          return true;
        });
      }

      if (_orderByField) {
        docs.sort((a, b) => {
          const aVal = (a.data() as Record<string, unknown>)[_orderByField!] as string;
          const bVal = (b.data() as Record<string, unknown>)[_orderByField!] as string;
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        });
      }

      if (_limitN !== null) docs = docs.slice(0, _limitN);
      return docs;
    }

    const collection: Record<string, unknown> = {
      doc: vi.fn((idOrData?: string) => {
        const id = typeof idOrData === "string" ? idOrData : `auto_${store.size}`;
        const docPath = `${parentPath}/${id}`;
        if (!store.has(docPath)) store.set(docPath, {});
        return createDocRef(docPath);
      }),
      where: vi.fn().mockImplementation((field: string, op: string, value: unknown) => {
        _whereClauses.push({ field, op, value });
        return collection;
      }),
      orderBy: vi.fn().mockImplementation((field: string) => {
        _orderByField = field;
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

  const db = {
    collection: vi.fn().mockImplementation((_name: string) => ({
      doc: vi.fn().mockImplementation((_uid: string) => ({
        collection: vi.fn().mockImplementation((_subName: string) =>
          createCollection(`${_name}/${_uid}/${_subName}`)
        ),
      })),
    })),
    _store: store,
  };

  return db;
}

describe("srm data layer", () => {
  let mockDb: ReturnType<typeof createInMemoryFirestore>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createInMemoryFirestore();
    vi.mocked(getAdminDB).mockResolvedValue(mockDb as never);
  });

  describe("getSupplierMessages", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getAdminDB).mockRejectedValueOnce(new Error("fail"));
      const result = await getSupplierMessages("uid-1");
      expect(result).toEqual([]);
    });

    it("returns messages when docs exist", async () => {
      await addSupplierMessage("uid-1", {
        supplierId: "cj",
        supplierName: "CJ",
        direction: "outgoing",
        subject: "Test",
        body: "Hello",
        status: "sent",
        messageType: "general",
        createdAt: "",
      });
      const result = await getSupplierMessages("uid-1");
      expect(result).toHaveLength(1);
    });
  });

  describe("addSupplierMessage", () => {
    it("creates a message", async () => {
      const id = await addSupplierMessage("uid-1", {
        supplierId: "cj",
        supplierName: "CJ",
        direction: "outgoing",
        subject: "Test",
        body: "Hello",
        status: "sent",
        messageType: "general",
        createdAt: "",
      });
      expect(id).toBeDefined();
    });
  });

  describe("markMessageRead", () => {
    it("marks message as read", async () => {
      await addSupplierMessage("uid-1", {
        supplierId: "cj",
        supplierName: "CJ",
        direction: "outgoing",
        subject: "Test",
        body: "Hello",
        status: "sent",
        messageType: "general",
        createdAt: "",
      });
      const messages = await getSupplierMessages("uid-1");
      await expect(markMessageRead("uid-1", messages[0].id)).resolves.not.toThrow();
    });
  });

  describe("deleteSupplierMessage", () => {
    it("deletes a message", async () => {
      await addSupplierMessage("uid-1", {
        supplierId: "cj",
        supplierName: "CJ",
        direction: "outgoing",
        subject: "Test",
        body: "Hello",
        status: "sent",
        messageType: "general",
        createdAt: "",
      });
      const messages = await getSupplierMessages("uid-1");
      await expect(deleteSupplierMessage("uid-1", messages[0].id)).resolves.not.toThrow();
    });
  });

  describe("getNegotiations", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getAdminDB).mockRejectedValueOnce(new Error("fail"));
      const result = await getNegotiations("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("addNegotiation", () => {
    it("creates a negotiation", async () => {
      const id = await addNegotiation("uid-1", {
        supplierId: "cj",
        supplierName: "CJ",
        productTitle: "Product",
        status: "active",
        rounds: [],
        initialPrice: 10,
        currentOffer: 10,
        targetPrice: 8,
        quantity: 100,
        notes: "",
        createdAt: "",
        updatedAt: "",
      });
      expect(id).toBeDefined();
    });
  });

  describe("updateNegotiation", () => {
    it("updates a negotiation", async () => {
      const id = await addNegotiation("uid-1", {
        supplierId: "cj",
        supplierName: "CJ",
        productTitle: "Product",
        status: "active",
        rounds: [],
        initialPrice: 10,
        currentOffer: 10,
        targetPrice: 8,
        quantity: 100,
        notes: "",
        createdAt: "",
        updatedAt: "",
      });
      await expect(updateNegotiation("uid-1", id!, { status: "accepted" })).resolves.not.toThrow();
    });
  });

  describe("getSupplierScorecards", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getAdminDB).mockRejectedValueOnce(new Error("fail"));
      const result = await getSupplierScorecards("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("saveSupplierScorecard", () => {
    it("saves a scorecard", async () => {
      await expect(saveSupplierScorecard("uid-1", {
        supplierId: "cj",
        supplierName: "CJ",
        overallScore: 85,
        criteria: {
          speed: { score: 80, weight: 0.2, weightedScore: 16, details: "", dataPoints: 1 },
          quality: { score: 90, weight: 0.25, weightedScore: 22.5, details: "", dataPoints: 1 },
          communication: { score: 85, weight: 0.15, weightedScore: 12.75, details: "", dataPoints: 1 },
          price: { score: 88, weight: 0.2, weightedScore: 17.6, details: "", dataPoints: 1 },
          reliability: { score: 82, weight: 0.2, weightedScore: 16.4, details: "", dataPoints: 1 },
        },
        grade: "B+",
        trend: "stable",
        lastEvaluated: "",
        history: [],
      })).resolves.not.toThrow();
    });
  });

  describe("getAutoSwitchRules", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getAdminDB).mockRejectedValueOnce(new Error("fail"));
      const result = await getAutoSwitchRules("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("addAutoSwitchRule", () => {
    it("creates a rule", async () => {
      const id = await addAutoSwitchRule("uid-1", {
        supplierId: "cj",
        supplierName: "CJ",
        enabled: true,
        threshold: 70,
        metric: "overall_score",
        action: "alert",
        triggerCount: 0,
        createdAt: "",
      });
      expect(id).toBeDefined();
    });
  });

  describe("updateAutoSwitchRule", () => {
    it("updates a rule", async () => {
      const id = await addAutoSwitchRule("uid-1", {
        supplierId: "cj",
        supplierName: "CJ",
        enabled: true,
        threshold: 70,
        metric: "overall_score",
        action: "alert",
        triggerCount: 0,
        createdAt: "",
      });
      await expect(updateAutoSwitchRule("uid-1", id!, { enabled: false })).resolves.not.toThrow();
    });
  });

  describe("deleteAutoSwitchRule", () => {
    it("deletes a rule", async () => {
      const id = await addAutoSwitchRule("uid-1", {
        supplierId: "cj",
        supplierName: "CJ",
        enabled: true,
        threshold: 70,
        metric: "overall_score",
        action: "alert",
        triggerCount: 0,
        createdAt: "",
      });
      await expect(deleteAutoSwitchRule("uid-1", id!)).resolves.not.toThrow();
    });
  });

  describe("getSupplierSwitchLogs", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getAdminDB).mockRejectedValueOnce(new Error("fail"));
      const result = await getSupplierSwitchLogs("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("addSupplierSwitchLog", () => {
    it("creates a switch log", async () => {
      const id = await addSupplierSwitchLog("uid-1", {
        fromSupplierId: "cj",
        fromSupplierName: "CJ",
        toSupplierId: "ali",
        toSupplierName: "AliExpress",
        reason: "Score dropped",
        triggerType: "auto",
        productIds: [],
        switchedAt: "",
      });
      expect(id).toBeDefined();
    });
  });
});
