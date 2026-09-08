import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, ...parts: string[]) => ({ id: parts[parts.length - 1] || "mock-doc-id", path: parts.join("/") })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  collection: vi.fn((_db: unknown, ...parts: string[]) => ({ id: parts[parts.length - 1] || "mock-collection", path: parts.join("/") })),
  query: vi.fn((_col: unknown, ...rest: unknown[]) => ({ _col, _query: rest })),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  where: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  db: {},
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
import { getDocs, setDoc, deleteDoc } from "firebase/firestore";

describe("srm data layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSupplierMessages", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error("fail"));
      const result = await getSupplierMessages("uid-1");
      expect(result).toEqual([]);
    });

    it("returns messages when docs exist", async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [{ id: "m1", data: () => ({ subject: "Test", body: "Hello" }) }],
      } as never);
      const result = await getSupplierMessages("uid-1");
      expect(result).toHaveLength(1);
    });
  });

  describe("addSupplierMessage", () => {
    it("creates a message", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
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
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      await expect(markMessageRead("uid-1", "m1")).resolves.not.toThrow();
    });
  });

  describe("deleteSupplierMessage", () => {
    it("deletes a message", async () => {
      vi.mocked(deleteDoc).mockResolvedValueOnce(undefined);
      await expect(deleteSupplierMessage("uid-1", "m1")).resolves.not.toThrow();
    });
  });

  describe("getNegotiations", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error("fail"));
      const result = await getNegotiations("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("addNegotiation", () => {
    it("creates a negotiation", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
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
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      await expect(updateNegotiation("uid-1", "n1", { status: "accepted" })).resolves.not.toThrow();
    });
  });

  describe("getSupplierScorecards", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error("fail"));
      const result = await getSupplierScorecards("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("saveSupplierScorecard", () => {
    it("saves a scorecard", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
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
      vi.mocked(getDocs).mockRejectedValueOnce(new Error("fail"));
      const result = await getAutoSwitchRules("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("addAutoSwitchRule", () => {
    it("creates a rule", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
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
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      await expect(updateAutoSwitchRule("uid-1", "r1", { enabled: false })).resolves.not.toThrow();
    });
  });

  describe("deleteAutoSwitchRule", () => {
    it("deletes a rule", async () => {
      vi.mocked(deleteDoc).mockResolvedValueOnce(undefined);
      await expect(deleteAutoSwitchRule("uid-1", "r1")).resolves.not.toThrow();
    });
  });

  describe("getSupplierSwitchLogs", () => {
    it("returns empty array on error", async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error("fail"));
      const result = await getSupplierSwitchLogs("uid-1");
      expect(result).toEqual([]);
    });
  });

  describe("addSupplierSwitchLog", () => {
    it("creates a switch log", async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
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
