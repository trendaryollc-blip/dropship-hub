import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { UserSettingsSchema } from "./schemas";

export interface UserSettings {
  aiProviderPriority: { id: string; active: boolean; priority: number }[];
  defaultCurrency: string;
  notifications: boolean;
  theme: "dark" | "light";
  digestSettings: {
    enabled: boolean;
    frequency: "daily" | "weekly";
    includeMetrics: boolean;
    includeAlerts: boolean;
    includeRecommendations: boolean;
    includeWeeklyTrend: boolean;
  };
}

export const defaultSettings: UserSettings = {
  aiProviderPriority: [
    { id: "gemini", active: true, priority: 1 },
    { id: "groq", active: true, priority: 2 },
    { id: "mistral", active: true, priority: 3 },
    { id: "openai", active: false, priority: 4 },
  ],
  defaultCurrency: "USD",
  notifications: true,
  theme: "dark",
  digestSettings: {
    enabled: true,
    frequency: "daily",
    includeMetrics: true,
    includeAlerts: true,
    includeRecommendations: true,
    includeWeeklyTrend: true,
  },
};

export async function getUserSettings(uid: string): Promise<UserSettings> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const parsed = UserSettingsSchema.partial().parse(snap.data());
      return { ...defaultSettings, ...parsed } as UserSettings;
    }
    await setDoc(doc(db, "users", uid), {
      ...defaultSettings,
      createdAt: serverTimestamp(),
    });
    return defaultSettings;
  } catch (error) {
    handleFirestoreError("getUserSettings", error);
  }
}

export async function updateUserSettings(uid: string, settings: Partial<UserSettings>) {
  try {
    await updateDoc(doc(db, "users", uid), settings);
  } catch (error) {
    handleFirestoreError("updateUserSettings", error);
  }
}
