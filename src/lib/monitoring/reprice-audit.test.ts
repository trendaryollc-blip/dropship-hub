import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RepriceAuditEntry } from "./types";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { logRepriceAction, getRepriceAuditLog, getRepriceStats } from "./reprice-audit";
import { getAdminDB } from "@/lib/firebase-admin";

function buildMockDb(entries: RepriceAuditEntry[]) {
  const mockDocs = entries.map((d, i) => ({
    id: `audit-${i}`,
    data: () => d,
  }));

  const mockSnapshot = {
    empty: entries.length === 0,
    docs: mockDocs,
  };

  const mockGet = vi.fn().mockResolvedValue(mockSnapshot);
  const mockLimit = vi.fn().mockReturnValue({ get: mockGet });
  const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockSubCollection = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockDoc = vi.fn().mockReturnValue({ collection: mockSubCollection });
  const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });

  const mockDocRef = {
    id: `audit-new-${Date.now()}`,
    set: vi.fn().mockResolvedValue(undefined),
  };
  const mockDocForWrite = vi.fn().mockReturnValue(mockDocRef);

  const db = {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          orderBy: mockOrderBy,
          doc: mockDocForWrite,
        }),
      }),
    }),
    _mockGet: mockGet,
  };

  return db;
}

describe("logRepriceAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs reprice action and returns doc id", async () => {
    const db = buildMockDb([]);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(db);

    const entry = {
      productId: "p1",
      productTitle: "Test Product",
      oldSellPrice: 30,
      newSellPrice: 28,
      supplierPrice: 10,
      ruleType: "undercut",
      ruleValue: 5,
      storeUpdated: true,
    };

    const id = await logRepriceAction("uid-1", entry);
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
  });

  it("returns empty string on error", async () => {
    (getAdminDB as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const entry = {
      productId: "p1",
      productTitle: "Test",
      oldSellPrice: 30,
      newSellPrice: 28,
      supplierPrice: 10,
      ruleType: "undercut",
      ruleValue: 5,
      storeUpdated: false,
    };

    const id = await logRepriceAction("uid-1", entry);
    expect(id).toBe("");
  });
});

describe("getRepriceAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns audit entries", async () => {
    const entries: RepriceAuditEntry[] = [
      {
        id: "a1",
        productId: "p1",
        productTitle: "Product 1",
        oldSellPrice: 30,
        newSellPrice: 28,
        supplierPrice: 10,
        ruleType: "undercut",
        ruleValue: 5,
        storeUpdated: true,
        createdAt: new Date().toISOString(),
      },
    ];
    const db = buildMockDb(entries);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(db);

    const result = await getRepriceAuditLog("uid-1");
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe("p1");
  });

  it("returns empty array on error", async () => {
    (getAdminDB as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const result = await getRepriceAuditLog("uid-1");
    expect(result).toEqual([]);
  });
});

describe("getRepriceStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero stats for empty collection", async () => {
    const db = buildMockDb([]);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(db);

    const result = await getRepriceStats("uid-1");
    expect(result.totalReprices).toBe(0);
    expect(result.successfulReprices).toBe(0);
    expect(result.failedReprices).toBe(0);
    expect(result.avgPriceChange).toBe(0);
    expect(result.lastRepriceTime).toBeNull();
  });

  it("calculates stats correctly", async () => {
    const entries: RepriceAuditEntry[] = [
      {
        id: "a1", productId: "p1", productTitle: "P1",
        oldSellPrice: 30, newSellPrice: 28, supplierPrice: 10,
        ruleType: "undercut", ruleValue: 5, storeUpdated: true,
        createdAt: "2025-01-15T10:00:00Z",
      },
      {
        id: "a2", productId: "p2", productTitle: "P2",
        oldSellPrice: 25, newSellPrice: 27, supplierPrice: 8,
        ruleType: "maintain_margin", ruleValue: 30, storeUpdated: false,
        error: "API timeout",
        createdAt: "2025-01-15T11:00:00Z",
      },
    ];
    const db = buildMockDb(entries);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(db);

    const result = await getRepriceStats("uid-1");
    expect(result.totalReprices).toBe(2);
    expect(result.successfulReprices).toBe(1);
    expect(result.failedReprices).toBe(1);
    expect(typeof result.avgPriceChange).toBe("number");
    expect(result.lastRepriceTime).toBe("2025-01-15T10:00:00Z");
  });

  it("returns zero stats on error", async () => {
    (getAdminDB as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const result = await getRepriceStats("uid-1");
    expect(result.totalReprices).toBe(0);
  });
});
