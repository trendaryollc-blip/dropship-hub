import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkGuardrails, getGuardrailStatus } from "./guardrails";
import { getAdminDB } from "@/lib/firebase-admin";
import type { GuardrailConfig } from "../types";

const { mockSet, mockUpdate, mockGet, mockDocRef, createMockDb } = vi.hoisted(() => {
  const mockSet = vi.fn().mockResolvedValue(undefined);
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockGet = vi.fn().mockResolvedValue({ exists: false, data: () => ({ count: 0, cost: 0 }) });
  const mockDocRef = { get: mockGet, set: mockSet, update: mockUpdate };
  const createMockDb = () => {
    const innerDocFn = vi.fn(() => mockDocRef);
    const innerCollectionFn = vi.fn(() => ({ doc: innerDocFn }));
    const docFn = vi.fn(() => ({ collection: innerCollectionFn }));
    const collectionFn = vi.fn(() => ({ doc: docFn }));
    return { collection: collectionFn };
  };
  return { mockSet, mockUpdate, mockGet, mockDocRef, createMockDb };
});

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockImplementation(() => Promise.resolve(createMockDb())),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ exists: false, data: () => ({ count: 0, cost: 0 }) });
  vi.mocked(getAdminDB).mockImplementation(() => Promise.resolve(createMockDb()) as any);
});

describe("Guardrails", () => {
  describe("checkGuardrails", () => {
    it("allows execution when within limits", async () => {
      const result = await checkGuardrails("user_1", "test_tool", {});
      expect(result.allowed).toBe(true);
    });

    it("blocks forbidden tools", async () => {
      const config: GuardrailConfig = {
        ...({} as GuardrailConfig),
        forbiddenTools: ["delete_all"],
        maxActionsPerHour: 100,
        maxActionsPerDay: 1000,
        maxDailyCost: 50,
        blockedInputPatterns: [],
      };
      const result = await checkGuardrails("user_1", "delete_all", {}, config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("forbidden");
    });

    it("blocks input matching blocked patterns", async () => {
      const config: GuardrailConfig = {
        ...({} as GuardrailConfig),
        forbiddenTools: [],
        maxActionsPerHour: 100,
        maxActionsPerDay: 1000,
        maxDailyCost: 50,
        blockedInputPatterns: ["drop all tables"],
      };
      const result = await checkGuardrails("user_1", "test_tool", { query: "drop all tables" }, config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("blocked pattern");
    });

    it("blocks when hourly limit exceeded", async () => {
      vi.mocked(getAdminDB).mockResolvedValue({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            collection: vi.fn(() => ({
              doc: vi.fn(() => ({
                get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ count: 100 }) }),
              })),
            })),
          })),
        })),
      } as never);

      const config: GuardrailConfig = {
        ...({} as GuardrailConfig),
        forbiddenTools: [],
        maxActionsPerHour: 50,
        maxActionsPerDay: 1000,
        maxDailyCost: 50,
        blockedInputPatterns: [],
      };
      const result = await checkGuardrails("user_1", "test_tool", {}, config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Hourly limit");
    });

    it("blocks when daily limit exceeded", async () => {
      const mockGetDaily = vi.fn().mockResolvedValue({ exists: true, data: () => ({ count: 1000 }) });
      const mockGetHourly = vi.fn().mockResolvedValue({ exists: true, data: () => ({ count: 5 }) });
      const mockDayDoc = { get: mockGetDaily };
      const mockHourDoc = { get: mockGetHourly };

      vi.mocked(getAdminDB).mockResolvedValue({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            collection: vi.fn(() => ({
              doc: vi.fn((key: string) => {
                if (key.startsWith("hour_")) return mockHourDoc;
                return mockDayDoc;
              }),
            })),
          })),
        })),
      } as never);

      const config: GuardrailConfig = {
        ...({} as GuardrailConfig),
        forbiddenTools: [],
        maxActionsPerHour: 200,
        maxActionsPerDay: 100,
        maxDailyCost: 50,
        blockedInputPatterns: [],
      };
      const result = await checkGuardrails("user_1", "test_tool", {}, config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Daily limit");
    });

    it("blocks when daily cost exceeded", async () => {
      vi.mocked(getAdminDB).mockResolvedValue({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            collection: vi.fn(() => ({
              doc: vi.fn(() => ({
                get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ cost: 100 }) }),
              })),
            })),
          })),
        })),
      } as never);

      const config: GuardrailConfig = {
        ...({} as GuardrailConfig),
        forbiddenTools: [],
        maxActionsPerHour: 200,
        maxActionsPerDay: 2000,
        maxDailyCost: 10,
        blockedInputPatterns: [],
      };
      const result = await checkGuardrails("user_1", "test_tool", {}, config);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Daily cost limit");
    });

    it("uses default config when none provided", async () => {
      const result = await checkGuardrails("user_1", "test_tool", {});
      expect(result.allowed).toBe(true);
    });
  });

  describe("getGuardrailStatus", () => {
    it("returns current status with limits", async () => {
      const status = await getGuardrailStatus("user_1");
      expect(status).toHaveProperty("hourlyActions");
      expect(status).toHaveProperty("dailyActions");
      expect(status).toHaveProperty("dailyCost");
      expect(status).toHaveProperty("limits");
    });
  });
});
