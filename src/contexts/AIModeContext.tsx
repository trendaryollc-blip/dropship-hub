"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import type { AIModePreferences, ExecutionMode, AutonomyLevel, ToolExecutionRecord } from "@/lib/ai/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AIModeContextValue {
  preferences: AIModePreferences | null;
  loading: boolean;
  pendingConfirmations: ToolExecutionRecord[];
  recentExecutions: ToolExecutionRecord[];
  
  setGlobalMode: (mode: ExecutionMode) => Promise<void>;
  setFeatureMode: (feature: string, mode: ExecutionMode) => Promise<void>;
  setAutonomyLevel: (level: AutonomyLevel) => Promise<void>;
  executeTool: (toolId: string, input: Record<string, unknown>) => Promise<{
    success: boolean;
    summary: string;
    data?: unknown;
    needsConfirmation?: boolean;
    executionId?: string;
  }>;
  confirmAction: (executionId: string) => Promise<boolean>;
  cancelAction: (executionId: string) => Promise<boolean>;
  refreshPending: () => Promise<void>;
  refreshRecent: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const AIModeContext = createContext<AIModeContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function AIModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AIModePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingConfirmations, setPendingConfirmations] = useState<ToolExecutionRecord[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<ToolExecutionRecord[]>([]);

  const uid = user?.uid;

  // Authenticated fetch helper
  const fetchWithAuth = useCallback(async <T = unknown>(url: string, init?: RequestInit): Promise<T> => {
    const token = user ? await user.getIdToken() : undefined;
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return safeFetch<T>(url, { ...init, headers });
  }, [user]);

  // Fetch preferences
  const refreshPreferences = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await fetchWithAuth<{ preferences: AIModePreferences }>("/api/ai/modes");
      if (res?.preferences) setPreferences(res.preferences);
    } catch {
      console.warn("Failed to fetch AI mode preferences");
    }
  }, [uid, fetchWithAuth]);

  // Fetch pending confirmations
  const refreshPending = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await fetchWithAuth<{ pending: ToolExecutionRecord[] }>("/api/ai/execute?action=pending");
      if (res?.pending) setPendingConfirmations(res.pending);
    } catch {
      console.warn("Failed to fetch pending confirmations");
    }
  }, [uid, fetchWithAuth]);

  // Fetch recent executions
  const refreshRecent = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await fetchWithAuth<{ executions: ToolExecutionRecord[] }>("/api/ai/execute?limit=10");
      if (res?.executions) setRecentExecutions(res.executions);
    } catch {
      console.warn("Failed to fetch recent executions");
    }
  }, [uid, fetchWithAuth]);

  // Initial load
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    Promise.all([refreshPreferences(), refreshPending(), refreshRecent()]).finally(() => setLoading(false));
  }, [uid, refreshPreferences, refreshPending, refreshRecent]);

  // Auto-refresh pending every 30s
  useEffect(() => {
    if (!uid) return;
    const interval = setInterval(refreshPending, 30000);
    return () => clearInterval(interval);
  }, [uid, refreshPending]);

  // Set global mode
  const setGlobalMode = useCallback(async (mode: ExecutionMode) => {
    if (!uid) return;
    try {
      const res = await fetchWithAuth<{ preferences: AIModePreferences }>("/api/ai/modes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "global", mode }),
      });
      if (res?.preferences) setPreferences(res.preferences);
    } catch (error) {
      console.error("Failed to set global mode", error);
    }
  }, [uid, fetchWithAuth]);

  // Set feature mode
  const setFeatureMode = useCallback(async (feature: string, mode: ExecutionMode) => {
    if (!uid) return;
    try {
      const res = await fetchWithAuth<{ preferences: AIModePreferences }>("/api/ai/modes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feature", feature, mode }),
      });
      if (res?.preferences) setPreferences(res.preferences);
    } catch (error) {
      console.error("Failed to set feature mode", error);
    }
  }, [uid, fetchWithAuth]);

  // Set autonomy level
  const setAutonomyLevel = useCallback(async (level: AutonomyLevel) => {
    if (!uid) return;
    try {
      const res = await fetchWithAuth<{ preferences: AIModePreferences }>("/api/ai/modes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "autonomy", autonomyLevel: level }),
      });
      if (res?.preferences) setPreferences(res.preferences);
    } catch (error) {
      console.error("Failed to set autonomy level", error);
    }
  }, [uid, fetchWithAuth]);

  // Execute a tool
  const executeTool = useCallback(async (toolId: string, input: Record<string, unknown>) => {
    if (!uid) return { success: false, summary: "Not authenticated" };
    try {
      const res = await fetchWithAuth<{
        success: boolean;
        summary: string;
        data?: unknown;
        error?: string;
        needsConfirmation?: boolean;
        executionId?: string;
      }>("/api/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: toolId, input }),
      });
      
      // Refresh pending after execution
      if (res?.needsConfirmation) {
        await refreshPending();
      }
      await refreshRecent();
      
      return {
        success: res?.success ?? false,
        summary: res?.summary ?? res?.error ?? "Unknown result",
        data: res?.data,
        needsConfirmation: res?.needsConfirmation,
        executionId: res?.executionId,
      };
    } catch (error) {
      return {
        success: false,
        summary: error instanceof Error ? error.message : "Execution failed",
      };
    }
  }, [uid, fetchWithAuth, refreshPending, refreshRecent]);

  // Confirm action
  const confirmAction = useCallback(async (executionId: string): Promise<boolean> => {
    if (!uid) return false;
    try {
      const res = await fetchWithAuth<{ success: boolean }>("/api/ai/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionId, action: "confirm" }),
      });
      await refreshPending();
      await refreshRecent();
      return res?.success ?? false;
    } catch {
      return false;
    }
  }, [uid, fetchWithAuth, refreshPending, refreshRecent]);

  // Cancel action
  const cancelAction = useCallback(async (executionId: string): Promise<boolean> => {
    if (!uid) return false;
    try {
      const res = await fetchWithAuth<{ success: boolean }>("/api/ai/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionId, action: "cancel" }),
      });
      await refreshPending();
      await refreshRecent();
      return res?.success ?? false;
    } catch {
      return false;
    }
  }, [uid, fetchWithAuth, refreshPending, refreshRecent]);

  const value: AIModeContextValue = {
    preferences,
    loading,
    pendingConfirmations,
    recentExecutions,
    setGlobalMode,
    setFeatureMode,
    setAutonomyLevel,
    executeTool,
    confirmAction,
    cancelAction,
    refreshPending,
    refreshRecent,
    refreshPreferences,
  };

  return <AIModeContext.Provider value={value}>{children}</AIModeContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAIMode() {
  const context = useContext(AIModeContext);
  if (!context) {
    throw new Error("useAIMode must be used within an AIModeProvider");
  }
  return context;
}

// ─── Feature mode helper ────────────────────────────────────────────────────

export function useFeatureMode(feature: string): {
  mode: ExecutionMode;
  setMode: (mode: ExecutionMode) => Promise<void>;
  isManual: boolean;
  isAIAssist: boolean;
  isAuto: boolean;
} {
  const { preferences, setFeatureMode } = useAIMode();
  
  const mode = preferences?.featureModes[feature] ?? preferences?.globalMode ?? "ai_assist";
  
  return {
    mode,
    setMode: (m: ExecutionMode) => setFeatureMode(feature, m),
    isManual: mode === "manual",
    isAIAssist: mode === "ai_assist",
    isAuto: mode === "auto",
  };
}
