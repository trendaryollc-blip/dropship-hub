import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getUserSettings, updateUserSettings, defaultSettings } from "./user-settings";

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "mock-ts"),
}));

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("./utils", () => ({
  handleFirestoreError: vi.fn((_ctx: string, err: unknown) => {
    throw err;
  }),
}));

const mockDoc = vi.mocked(doc);
const mockSetDoc = vi.mocked(setDoc);
const mockGetDoc = vi.mocked(getDoc);
const mockUpdateDoc = vi.mocked(updateDoc);

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockReturnValue("docRef" as any);
  mockSetDoc.mockResolvedValue(undefined as any);
  mockUpdateDoc.mockResolvedValue(undefined as any);
});

describe("defaultSettings", () => {
  it("has correct default values", () => {
    expect(defaultSettings.defaultCurrency).toBe("USD");
    expect(defaultSettings.notifications).toBe(true);
    expect(defaultSettings.theme).toBe("dark");
    expect(defaultSettings.aiProviderPriority).toHaveLength(4);
    expect(defaultSettings.digestSettings.enabled).toBe(true);
    expect(defaultSettings.digestSettings.frequency).toBe("daily");
  });
});

describe("getUserSettings", () => {
  it("returns existing settings merged with defaults", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        theme: "light",
        defaultCurrency: "EUR",
      }),
    } as any);

    const result = await getUserSettings("uid1");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1");
    expect(result.theme).toBe("light");
    expect(result.defaultCurrency).toBe("EUR");
    expect(result.notifications).toBe(true);
    expect(result.aiProviderPriority).toHaveLength(4);
  });

  it("creates default settings when doc does not exist", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as any);

    const result = await getUserSettings("uid1");
    expect(mockSetDoc).toHaveBeenCalledWith("docRef", {
      ...defaultSettings,
      createdAt: "mock-ts",
    });
    expect(result).toEqual(defaultSettings);
  });

  it("throws when getDoc fails", async () => {
    mockGetDoc.mockRejectedValue(new Error("get fail"));
    await expect(getUserSettings("uid1")).rejects.toThrow("get fail");
  });

  it("throws when setDoc fails on creation", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as any);
    mockSetDoc.mockRejectedValue(new Error("create fail"));
    await expect(getUserSettings("uid1")).rejects.toThrow("create fail");
  });
});

describe("updateUserSettings", () => {
  it("updates partial settings", async () => {
    await updateUserSettings("uid1", { theme: "light" });
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "uid1");
    expect(mockUpdateDoc).toHaveBeenCalledWith("docRef", { theme: "light" });
  });

  it("updates multiple settings", async () => {
    const updates = {
      theme: "light" as const,
      defaultCurrency: "EUR",
      notifications: false,
    };
    await updateUserSettings("uid1", updates);
    expect(mockUpdateDoc).toHaveBeenCalledWith("docRef", updates);
  });

  it("updates nested digest settings", async () => {
    await updateUserSettings("uid1", {
      digestSettings: {
        enabled: false,
        frequency: "weekly",
        includeMetrics: true,
        includeAlerts: false,
        includeRecommendations: true,
        includeWeeklyTrend: false,
      },
    });
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it("throws when updateDoc fails", async () => {
    mockUpdateDoc.mockRejectedValue(new Error("update fail"));
    await expect(
      updateUserSettings("uid1", { theme: "light" })
    ).rejects.toThrow("update fail");
  });
});
