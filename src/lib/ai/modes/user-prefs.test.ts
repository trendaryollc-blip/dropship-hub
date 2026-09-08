import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getModePreferences,
  updateModePreferences,
  setGlobalMode,
  setFeatureMode,
  setAutonomyLevel,
  setGuardrails,
  addAutoRule,
  updateAutoRule,
  deleteAutoRule,
  getAutoRules,
  getEnabledAutoRules,
  getFeatureMode,
  getAutonomyLevel,
} from "./user-prefs";
import { getAdminDB } from "@/lib/firebase-admin";

const { mockSet, mockGet, mockSettingsDoc, mockSettingsCollection, mockUserDoc, mockUsersCollection, mockDb } = vi.hoisted(() => {
  const mockSet = vi.fn().mockResolvedValue(undefined);
  const mockGet = vi.fn().mockResolvedValue({ exists: false, data: () => null });
  const mockSettingsDoc = { get: mockGet, set: mockSet };
  const mockSettingsCollection = { doc: vi.fn(() => mockSettingsDoc) };
  const mockUserDoc = { collection: vi.fn(() => mockSettingsCollection) };
  const mockUsersCollection = { doc: vi.fn(() => mockUserDoc) };
  const mockDb = { collection: vi.fn(() => mockUsersCollection) };
  return { mockSet, mockGet, mockSettingsDoc, mockSettingsCollection, mockUserDoc, mockUsersCollection, mockDb };
});

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue(mockDb),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ exists: false, data: () => null });
});

describe("User Prefs", () => {
  describe("getModePreferences", () => {
    it("returns default preferences when none exist", async () => {
      const prefs = await getModePreferences("user_1");
      expect(prefs.uid).toBe("user_1");
      expect(prefs.globalMode).toBe("ai_assist");
      expect(prefs.autonomyLevel).toBe(1);
    });

    it("returns stored preferences", async () => {
      const storedPrefs = {
        uid: "user_1",
        globalMode: "auto",
        autonomyLevel: 3,
        featureModes: {},
        autoRules: [],
        guardrails: {},
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };
      mockGet.mockResolvedValue({ exists: true, data: () => storedPrefs });

      const prefs = await getModePreferences("user_1");
      expect(prefs.globalMode).toBe("auto");
      expect(prefs.autonomyLevel).toBe(3);
    });
  });

  describe("updateModePreferences", () => {
    it("updates preferences", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 1,
          featureModes: {},
          autoRules: [],
          guardrails: {},
        }),
      });

      const updated = await updateModePreferences("user_1", { autonomyLevel: 3 });
      expect(updated.autonomyLevel).toBe(3);
      expect(mockSet).toHaveBeenCalled();
    });
  });

  describe("setGlobalMode", () => {
    it("sets global mode", async () => {
      const updated = await setGlobalMode("user_1", "auto");
      expect(updated.globalMode).toBe("auto");
    });
  });

  describe("setFeatureMode", () => {
    it("sets feature mode", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 1,
          featureModes: {},
          autoRules: [],
          guardrails: {},
        }),
      });

      const updated = await setFeatureMode("user_1", "financial", "manual");
      expect(updated.featureModes.financial).toBe("manual");
    });
  });

  describe("setAutonomyLevel", () => {
    it("sets autonomy level", async () => {
      const updated = await setAutonomyLevel("user_1", 4);
      expect(updated.autonomyLevel).toBe(4);
    });
  });

  describe("setGuardrails", () => {
    it("sets guardrails", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 1,
          featureModes: {},
          autoRules: [],
          guardrails: {},
        }),
      });

      const updated = await setGuardrails("user_1", { maxDailyCost: 100 });
      expect(updated.guardrails.maxDailyCost).toBe(100);
    });
  });

  describe("addAutoRule", () => {
    it("adds a new auto rule", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 1,
          featureModes: {},
          autoRules: [],
          guardrails: {},
        }),
      });

      const rule = await addAutoRule("user_1", {
        toolId: "get_alerts",
        enabled: true,
        trigger: "schedule",
        schedule: "hourly",
        params: {},
        lastRunAt: null,
        nextRunAt: null,
      });

      expect(rule.id).toBeDefined();
      expect(rule.toolId).toBe("get_alerts");
      expect(rule.enabled).toBe(true);
    });
  });

  describe("updateAutoRule", () => {
    it("updates an existing rule", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 1,
          featureModes: {},
          autoRules: [
            {
              id: "rule_1",
              toolId: "get_alerts",
              enabled: true,
              trigger: "schedule",
              schedule: "hourly",
              params: {},
              lastRunAt: null,
              nextRunAt: null,
            },
          ],
          guardrails: {},
        }),
      });

      const updated = await updateAutoRule("user_1", "rule_1", { enabled: false });
      expect(updated).not.toBeNull();
      expect(updated!.enabled).toBe(false);
    });

    it("returns null for non-existent rule", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 1,
          featureModes: {},
          autoRules: [],
          guardrails: {},
        }),
      });

      const updated = await updateAutoRule("user_1", "nonexistent", { enabled: false });
      expect(updated).toBeNull();
    });
  });

  describe("deleteAutoRule", () => {
    it("deletes an existing rule", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 1,
          featureModes: {},
          autoRules: [
            {
              id: "rule_1",
              toolId: "get_alerts",
              enabled: true,
              trigger: "schedule",
              schedule: "hourly",
              params: {},
              lastRunAt: null,
              nextRunAt: null,
            },
          ],
          guardrails: {},
        }),
      });

      const result = await deleteAutoRule("user_1", "rule_1");
      expect(result).toBe(true);
    });

    it("returns false for non-existent rule", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 1,
          featureModes: {},
          autoRules: [],
          guardrails: {},
        }),
      });

      const result = await deleteAutoRule("user_1", "nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("getAutoRules", () => {
    it("returns all rules", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 1,
          featureModes: {},
          autoRules: [
            { id: "rule_1", enabled: true },
            { id: "rule_2", enabled: false },
          ],
          guardrails: {},
        }),
      });

      const rules = await getAutoRules("user_1");
      expect(rules.length).toBe(2);
    });
  });

  describe("getEnabledAutoRules", () => {
    it("returns only enabled rules", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 1,
          featureModes: {},
          autoRules: [
            { id: "rule_1", enabled: true },
            { id: "rule_2", enabled: false },
          ],
          guardrails: {},
        }),
      });

      const rules = await getEnabledAutoRules("user_1");
      expect(rules.length).toBe(1);
      expect(rules[0].id).toBe("rule_1");
    });
  });

  describe("getFeatureMode", () => {
    it("returns feature mode or falls back to global", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 1,
          featureModes: { financial: "manual" },
          autoRules: [],
          guardrails: {},
        }),
      });

      const mode = await getFeatureMode("user_1", "financial");
      expect(mode).toBe("manual");
    });

    it("returns global mode when no feature override", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "auto",
          autonomyLevel: 1,
          featureModes: {},
          autoRules: [],
          guardrails: {},
        }),
      });

      const mode = await getFeatureMode("user_1", "financial");
      expect(mode).toBe("auto");
    });
  });

  describe("getAutonomyLevel", () => {
    it("returns autonomy level", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          uid: "user_1",
          globalMode: "ai_assist",
          autonomyLevel: 3,
          featureModes: {},
          autoRules: [],
          guardrails: {},
        }),
      });

      const level = await getAutonomyLevel("user_1");
      expect(level).toBe(3);
    });
  });
});
