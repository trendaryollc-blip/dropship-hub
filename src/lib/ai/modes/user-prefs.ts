import { getAdminDB } from "@/lib/firebase-admin";
import type { AIModePreferences, ExecutionMode, AutonomyLevel, AutoModeRule, GuardrailConfig } from "../types";
import { DEFAULT_MODE_PREFERENCES, DEFAULT_GUARDRAILS } from "../types";

// ─── User Mode Preferences ──────────────────────────────────────────────────
// Stores per-user mode preferences in Firestore.
// Path: users/{uid}/settings/aiMode

const SETTINGS_DOC = "aiMode";
const SETTINGS_COLLECTION = "settings";

export async function getModePreferences(uid: string): Promise<AIModePreferences> {
  const db = await getAdminDB();
  const doc = await db
    .collection("users")
    .doc(uid)
    .collection(SETTINGS_COLLECTION)
    .doc(SETTINGS_DOC)
    .get();

  if (!doc.exists) {
    return {
      ...DEFAULT_MODE_PREFERENCES,
      uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return doc.data() as AIModePreferences;
}

export async function updateModePreferences(
  uid: string,
  updates: Partial<Omit<AIModePreferences, "uid" | "createdAt" | "updatedAt">>
): Promise<AIModePreferences> {
  const db = await getAdminDB();
  const existing = await getModePreferences(uid);

  const updated: AIModePreferences = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await db
    .collection("users")
    .doc(uid)
    .collection(SETTINGS_COLLECTION)
    .doc(SETTINGS_DOC)
    .set(updated, { merge: true });

  return updated;
}

export async function setGlobalMode(uid: string, mode: ExecutionMode): Promise<AIModePreferences> {
  return updateModePreferences(uid, { globalMode: mode });
}

export async function setFeatureMode(uid: string, feature: string, mode: ExecutionMode): Promise<AIModePreferences> {
  const prefs = await getModePreferences(uid);
  const featureModes = { ...prefs.featureModes, [feature]: mode };
  return updateModePreferences(uid, { featureModes });
}

export async function setAutonomyLevel(uid: string, level: AutonomyLevel): Promise<AIModePreferences> {
  return updateModePreferences(uid, { autonomyLevel: level });
}

export async function setGuardrails(uid: string, guards: Partial<GuardrailConfig>): Promise<AIModePreferences> {
  const prefs = await getModePreferences(uid);
  const guardrails = { ...DEFAULT_GUARDRAILS, ...prefs.guardrails, ...guards };
  return updateModePreferences(uid, { guardrails });
}

// ─── Auto Mode Rules ────────────────────────────────────────────────────────

export async function addAutoRule(uid: string, rule: Omit<AutoModeRule, "id" | "uid" | "createdAt" | "updatedAt">): Promise<AutoModeRule> {
  const _db = await getAdminDB();
  const prefs = await getModePreferences(uid);
  const newRule: AutoModeRule = {
    ...rule,
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedRules = [...prefs.autoRules, newRule];
  await updateModePreferences(uid, { autoRules: updatedRules });

  return newRule;
}

export async function updateAutoRule(
  uid: string,
  ruleId: string,
  updates: Partial<Omit<AutoModeRule, "id" | "uid" | "createdAt" | "updatedAt">>
): Promise<AutoModeRule | null> {
  const prefs = await getModePreferences(uid);
  const ruleIndex = prefs.autoRules.findIndex((r) => r.id === ruleId);
  if (ruleIndex === -1) return null;

  const updatedRule: AutoModeRule = {
    ...prefs.autoRules[ruleIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const updatedRules = [...prefs.autoRules];
  updatedRules[ruleIndex] = updatedRule;
  await updateModePreferences(uid, { autoRules: updatedRules });

  return updatedRule;
}

export async function deleteAutoRule(uid: string, ruleId: string): Promise<boolean> {
  const prefs = await getModePreferences(uid);
  const filtered = prefs.autoRules.filter((r) => r.id !== ruleId);
  if (filtered.length === prefs.autoRules.length) return false;

  await updateModePreferences(uid, { autoRules: filtered });
  return true;
}

export async function getAutoRules(uid: string): Promise<AutoModeRule[]> {
  const prefs = await getModePreferences(uid);
  return prefs.autoRules;
}

export async function getEnabledAutoRules(uid: string): Promise<AutoModeRule[]> {
  const prefs = await getModePreferences(uid);
  return prefs.autoRules.filter((r) => r.enabled);
}

// ─── Helper: Get mode for a specific feature ────────────────────────────────

export async function getFeatureMode(uid: string, feature: string): Promise<ExecutionMode> {
  const prefs = await getModePreferences(uid);
  return prefs.featureModes[feature] ?? prefs.globalMode;
}

export async function getAutonomyLevel(uid: string): Promise<AutonomyLevel> {
  const prefs = await getModePreferences(uid);
  return prefs.autonomyLevel;
}
