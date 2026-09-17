"use client";

import { useState, useCallback } from "react";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import type { DigestData, DigestPreferences } from "@/types/digest";

interface DigestListResponse {
  digests?: DigestData[];
}

interface DigestSingleResponse {
  digest?: DigestData;
}

interface DigestGenerateResponse extends DigestData {
  notifications?: { emailSent: boolean; pushTriggered: boolean };
}

export function useDigest() {
  const [generating, setGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const digestUrl = selectedDate
    ? `/api/digest?date=${selectedDate}`
    : "/api/digest";

  const { data: digestListData, isLoading, mutate: refetchDigests } = useAPI<DigestListResponse>("/api/digest");
  const { data: singleDigestData } = useAPI<DigestSingleResponse>(
    selectedDate ? digestUrl : null
  );

  const digests = digestListData?.digests || [];
  const currentDigest = singleDigestData?.digest || digests[0] || null;
  const history = digests.slice(0, 30);

  const { data: historyData } = useAPI<{ days: { date: string; revenue: number; profit: number; orders: number }[] }>("/api/digest/history");

  const { data: prefsData } = useAPI<{ preferences: DigestPreferences }>("/api/digest/preferences");
  const preferences = prefsData?.preferences || null;

  const generateDigest = useCallback(
    async (options?: { date?: string; email?: string; notify?: boolean }) => {
      setGenerating(true);
      try {
        const data = await safeFetch<DigestGenerateResponse>("/api/digest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: options?.date || new Date().toISOString().split("T")[0],
            email: options?.email,
            notify: options?.notify,
          }),
        });
        if (data?.date) {
          refetchDigests();
          return data;
        }
        return null;
      } catch {
        return null;
      } finally {
        setGenerating(false);
      }
    },
    [refetchDigests]
  );

  const deleteDigest = useCallback(
    async (date: string) => {
      try {
        await safeFetch(`/api/digest?date=${date}`, { method: "DELETE" });
        refetchDigests();
        return true;
      } catch {
        return false;
      }
    },
    [refetchDigests]
  );

  const updatePreferences = useCallback(
    async (prefs: Partial<DigestPreferences>) => {
      try {
        await safeFetch("/api/digest/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(prefs),
        });
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  return {
    currentDigest,
    history,
    historyChart: historyData?.days || [],
    generating,
    isLoading,
    preferences,
    selectedDate,
    setSelectedDate,
    generateDigest,
    deleteDigest,
    updatePreferences,
    refetchDigests,
  };
}
