import {
  doc, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs,
  serverTimestamp, Timestamp, getDoc, writeBatch, startAfter,
} from "firebase/firestore";
import { db } from "../firebase";
import { handleFirestoreError } from "./utils";
import { MissionEntrySchema, AddMissionInputSchema, AddCustomMissionInputSchema } from "./schemas";

export type MissionType = "daily" | "weekly" | "achievement" | "bonus";
export type MissionPriority = "high" | "medium" | "low";

export interface MissionEntry {
  id: string;
  text: string;
  done: boolean;
  date: string;
  createdAt: Timestamp;
  type?: MissionType;
  priority?: MissionPriority;
  category?: string;
  impact?: string;
  source?: string;
  aiGenerated?: boolean;
  completedAt?: string;
  progress?: number;
  totalSteps?: number;
  xpAwarded?: number;
  expiresAt?: string;
}

export interface GamificationStats {
  totalXP: number;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  streak: number;
  longestStreak: number;
  totalMissionsCompleted: number;
  badges: string[];
  weeklyXP: number;
  todayXP: number;
}

export interface BadgeContext {
  stats: GamificationStats;
  weeklyComplete?: boolean;
  earlyBird?: boolean;
  diverseCategories?: boolean;
  bonusCount?: number;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: (ctx: BadgeContext) => boolean;
  tier: "bronze" | "silver" | "gold" | "diamond";
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "first_mission", name: "First Steps", description: "Complete your first mission", icon: "🎯", tier: "bronze", requirement: (ctx) => ctx.stats.totalMissionsCompleted >= 1 },
  { id: "five_missions", name: "Getting Started", description: "Complete 5 missions", icon: "⭐", tier: "bronze", requirement: (ctx) => ctx.stats.totalMissionsCompleted >= 5 },
  { id: "ten_missions", name: "On a Roll", description: "Complete 10 missions", icon: "🔥", tier: "silver", requirement: (ctx) => ctx.stats.totalMissionsCompleted >= 10 },
  { id: "twentyfive_missions", name: "Mission Master", description: "Complete 25 missions", icon: "🏆", tier: "gold", requirement: (ctx) => ctx.stats.totalMissionsCompleted >= 25 },
  { id: "fifty_missions", name: "Legendary", description: "Complete 50 missions", icon: "💎", tier: "diamond", requirement: (ctx) => ctx.stats.totalMissionsCompleted >= 50 },
  { id: "streak_3", name: "Consistent", description: "3-day streak", icon: "📅", tier: "bronze", requirement: (ctx) => ctx.stats.streak >= 3 },
  { id: "streak_7", name: "Week Warrior", description: "7-day streak", icon: "🗓️", tier: "silver", requirement: (ctx) => ctx.stats.streak >= 7 },
  { id: "streak_14", name: "Fortnight Fighter", description: "14-day streak", icon: "⚡", tier: "gold", requirement: (ctx) => ctx.stats.streak >= 14 },
  { id: "streak_30", name: "Monthly Machine", description: "30-day streak", icon: "👑", tier: "diamond", requirement: (ctx) => ctx.stats.streak >= 30 },
  { id: "level_5", name: "Leveling Up", description: "Reach Level 5", icon: "📈", tier: "bronze", requirement: (ctx) => ctx.stats.level >= 5 },
  { id: "level_10", name: "Double Digits", description: "Reach Level 10", icon: "🎖️", tier: "silver", requirement: (ctx) => ctx.stats.level >= 10 },
  { id: "level_20", name: "Elite", description: "Reach Level 20", icon: "🏅", tier: "gold", requirement: (ctx) => ctx.stats.level >= 20 },
  { id: "level_50", name: "Dropshipping Legend", description: "Reach Level 50", icon: "🌟", tier: "diamond", requirement: (ctx) => ctx.stats.level >= 50 },
  { id: "xp_1000", name: "XP Hunter", description: "Earn 1,000 total XP", icon: "💪", tier: "bronze", requirement: (ctx) => ctx.stats.totalXP >= 1000 },
  { id: "xp_5000", name: "XP Collector", description: "Earn 5,000 total XP", icon: "🎯", tier: "silver", requirement: (ctx) => ctx.stats.totalXP >= 5000 },
  { id: "xp_25000", name: "XP Legend", description: "Earn 25,000 total XP", icon: "🚀", tier: "gold", requirement: (ctx) => ctx.stats.totalXP >= 25000 },
  { id: "weekly_warrior", name: "Weekly Warrior", description: "Complete all weekly missions in a week", icon: "⚔️", tier: "silver", requirement: (ctx) => ctx.weeklyComplete === true },
  { id: "early_bird", name: "Early Bird", description: "Complete 3 missions before noon", icon: "🌅", tier: "bronze", requirement: (ctx) => ctx.earlyBird === true },
  { id: "category_diverse", name: "Well Rounded", description: "Complete missions in 5 different categories", icon: "🌈", tier: "silver", requirement: (ctx) => ctx.diverseCategories === true },
  { id: "bonus_hunter", name: "Bonus Hunter", description: "Complete 5 bonus missions", icon: "🎁", tier: "silver", requirement: (ctx) => (ctx.bonusCount || 0) >= 5 },
];

export const XP_PER_CATEGORY: Record<string, number> = {
  revenue: 75,
  products: 60,
  suppliers: 50,
  "customer-service": 80,
  alerts: 40,
  store: 50,
  setup: 100,
  research: 30,
  weekly: 50,
  achievement: 100,
  bonus: 40,
  custom: 25,
};

export function calculateLevel(totalXP: number) {
  const level = Math.floor(totalXP / 500) + 1;
  const currentXP = totalXP % 500;
  return { level, currentXP, nextLevelXP: 500 };
}

export async function addMission(uid: string, mission: Omit<MissionEntry, "id" | "createdAt">) {
  try {
    const input = AddMissionInputSchema.parse(mission);
    const ref = doc(collection(db, "users", uid, "missions"));
    await setDoc(ref, { ...input, createdAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError("addMission", error);
  }
}

export async function addCustomMission(
  uid: string,
  mission: { text: string; date: string; priority?: MissionPriority; category?: string; type?: MissionType }
) {
  try {
    const input = AddCustomMissionInputSchema.parse(mission);
    const ref = doc(collection(db, "users", uid, "missions"));
    await setDoc(ref, {
      text: input.text,
      done: false,
      date: input.date,
      aiGenerated: false,
      priority: input.priority || "medium",
      category: input.category || "custom",
      type: input.type || "daily",
      impact: "Custom mission",
      source: "manual",
      progress: 0,
      totalSteps: 1,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError("addCustomMission", error);
  }
}

export async function getMissions(uid: string, date?: string): Promise<MissionEntry[]> {
  try {
    const today = date || new Date().toISOString().split("T")[0];
    const q = query(
      collection(db, "users", uid, "missions"),
      where("date", "==", today),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...MissionEntrySchema.parse(d.data()) }));
  } catch (error) {
    handleFirestoreError("getMissions", error);
  }
}

export async function getMissionHistory(
  uid: string,
  opts: { pageSize?: number; lastDoc?: unknown; startDate?: string; endDate?: string } = {}
): Promise<{ missions: MissionEntry[]; lastDoc: unknown; hasMore: boolean }> {
  try {
    const { pageSize = 20, lastDoc, startDate, endDate } = opts;
    let q = query(
      collection(db, "users", uid, "missions"),
      orderBy("createdAt", "desc"),
      limit(pageSize + 1)
    );
    if (startDate) q = query(q, where("date", ">=", startDate));
    if (endDate) q = query(q, where("date", "<=", endDate));
    if (lastDoc) q = query(q, startAfter(lastDoc));

    const snap = await getDocs(q);
    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const missions = docs.slice(0, pageSize).map((d) => ({ id: d.id, ...d.data() } as MissionEntry));
    return { missions, lastDoc: docs.length > 0 ? docs[docs.length - 1] : null, hasMore };
  } catch (error) {
    handleFirestoreError("getMissionHistory", error);
    return { missions: [], lastDoc: null, hasMore: false };
  }
}

export async function toggleMission(uid: string, missionId: string, done: boolean) {
  try {
    await updateDoc(doc(db, "users", uid, "missions", missionId), { done });
  } catch (error) {
    handleFirestoreError("toggleMission", error);
  }
}

export async function updateMissionProgress(uid: string, missionId: string, progress: number, totalSteps: number) {
  try {
    await updateDoc(doc(db, "users", uid, "missions", missionId), { progress, totalSteps });
  } catch (error) {
    handleFirestoreError("updateMissionProgress", error);
  }
}

export async function deleteMission(uid: string, missionId: string) {
  try {
    await updateDoc(doc(db, "users", uid, "missions", missionId), { deleted: true });
  } catch (error) {
    handleFirestoreError("deleteMission", error);
  }
}

export async function cleanupExpiredMissions(uid: string) {
  try {
    const now = new Date().toISOString();
    const q = query(
      collection(db, "users", uid, "missions"),
      where("expiresAt", "<", now)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const batch = writeBatch(db);
    for (const d of snap.docs) {
      batch.delete(d.ref);
    }
    await batch.commit();
    return snap.size;
  } catch (error) {
    handleFirestoreError("cleanupExpiredMissions", error);
    return 0;
  }
}

export async function getGamificationStats(uid: string): Promise<GamificationStats> {
  try {
    const statsDoc = await getDoc(doc(db, "users", uid, "gamification", "stats"));
    if (statsDoc.exists()) {
      return statsDoc.data() as GamificationStats;
    }
    return {
      totalXP: 0, level: 1, currentXP: 0, nextLevelXP: 500,
      streak: 0, longestStreak: 0, totalMissionsCompleted: 0,
      badges: [], weeklyXP: 0, todayXP: 0,
    };
  } catch (error) {
    handleFirestoreError("getGamificationStats", error);
    return {
      totalXP: 0, level: 1, currentXP: 0, nextLevelXP: 500,
      streak: 0, longestStreak: 0, totalMissionsCompleted: 0,
      badges: [], weeklyXP: 0, todayXP: 0,
    };
  }
}

export async function saveGamificationStats(uid: string, stats: GamificationStats) {
  try {
    await setDoc(doc(db, "users", uid, "gamification", "stats"), stats);
  } catch (error) {
    handleFirestoreError("saveGamificationStats", error);
  }
}
