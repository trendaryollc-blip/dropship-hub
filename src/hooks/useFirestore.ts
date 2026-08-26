"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorited,
  saveCalcHistory,
  getCalcHistory,
  saveChatMessage,
  getChatHistory,
  type Favorite,
  type CalcHistoryEntry,
  type ChatMessage,
} from "@/lib/data";

// ===== useFavorites =====
export function useFavorites(type?: Favorite["type"]) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setFavorites([]); setLoading(false); return; }
    setLoading(true);
    const favs = await getFavorites(user.uid, type);
    setFavorites(favs);
    setLoading(false);
  }, [user, type]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch is safe
  useEffect(() => { void refresh(); }, [refresh]);

  const toggle = useCallback(async (itemId: string, title: string) => {
    if (!user || !type) return;
    const favId = `${type}_${itemId}`;
    const exists = favorites.some((f) => f.id === favId);
    if (exists) {
      await removeFavorite(user.uid, type, itemId);
    } else {
      await addFavorite(user.uid, type, itemId, title);
    }
    await refresh();
  }, [user, type, favorites, refresh]);

  const check = useCallback(async (itemId: string): Promise<boolean> => {
    if (!user || !type) return false;
    return isFavorited(user.uid, type, itemId);
  }, [user, type]);

  return { favorites, loading, toggle, check, refresh };
}

// ===== useCalcHistory =====
export function useCalcHistory(type?: CalcHistoryEntry["type"]) {
  const { user } = useAuth();
  const [history, setHistory] = useState<CalcHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setHistory([]); setLoading(false); return; }
    setLoading(true);
    const h = await getCalcHistory(user.uid, type);
    setHistory(h);
    setLoading(false);
  }, [user, type]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch is safe
  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async (entry: Omit<CalcHistoryEntry, "id" | "savedAt">) => {
    if (!user) return;
    await saveCalcHistory(user.uid, entry);
    await refresh();
  }, [user, refresh]);

  return { history, loading, save, refresh };
}

// ===== useChatHistory =====
export function useChatHistory() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setMessages([]); setLoading(false); return; }
    setLoading(true);
    const msgs = await getChatHistory(user.uid);
    setMessages(msgs);
    setLoading(false);
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch is safe
  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async (msg: Omit<ChatMessage, "id" | "timestamp">) => {
    if (!user) return;
    await saveChatMessage(user.uid, msg);
  }, [user]);

  return { messages, loading, save, refresh };
}
