"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { logger } from "@/lib/logger";

// ===== useFavorites =====
export function useFavorites(type?: Favorite["type"]) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!user) { setFavorites([]); setLoading(false); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    getFavorites(user.uid, type)
      .then((favs) => {
        if (!controller.signal.aborted) setFavorites(favs);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          logger.error("Failed to load favorites", { error: err instanceof Error ? err.message : String(err) });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => { controller.abort(); };
  }, [user, type]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const favs = await getFavorites(user.uid, type);
      setFavorites(favs);
    } catch (err) {
      logger.error("Failed to refresh favorites", { error: err instanceof Error ? err.message : String(err) });
    }
  }, [user, type]);

  const toggle = useCallback(async (itemId: string, title: string) => {
    if (!user || !type) return;
    const favId = `${type}_${itemId}`;
    const exists = favorites.some((f) => f.id === favId);
    try {
      if (exists) {
        await removeFavorite(user.uid, type, itemId);
      } else {
        await addFavorite(user.uid, type, itemId, title);
      }
      await refresh();
    } catch (err) {
      logger.error("Failed to toggle favorite", { error: err instanceof Error ? err.message : String(err) });
    }
  }, [user, type, favorites, refresh]);

  const check = useCallback(async (itemId: string): Promise<boolean> => {
    if (!user || !type) return false;
    try {
      return await isFavorited(user.uid, type, itemId);
    } catch {
      return false;
    }
  }, [user, type]);

  return { favorites, loading, toggle, check, refresh };
}

// ===== useCalcHistory =====
export function useCalcHistory(type?: CalcHistoryEntry["type"]) {
  const { user } = useAuth();
  const [history, setHistory] = useState<CalcHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!user) { setHistory([]); setLoading(false); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    getCalcHistory(user.uid, type)
      .then((h) => {
        if (!controller.signal.aborted) setHistory(h);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          logger.error("Failed to load calc history", { error: err instanceof Error ? err.message : String(err) });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => { controller.abort(); };
  }, [user, type]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const h = await getCalcHistory(user.uid, type);
      setHistory(h);
    } catch (err) {
      logger.error("Failed to refresh calc history", { error: err instanceof Error ? err.message : String(err) });
    }
  }, [user, type]);

  const save = useCallback(async (entry: Omit<CalcHistoryEntry, "id" | "savedAt">) => {
    if (!user) return;
    try {
      await saveCalcHistory(user.uid, entry);
      await refresh();
    } catch (err) {
      logger.error("Failed to save calc history", { error: err instanceof Error ? err.message : String(err) });
    }
  }, [user, refresh]);

  return { history, loading, save, refresh };
}

// ===== useChatHistory =====
export function useChatHistory() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!user) { setMessages([]); setLoading(false); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    getChatHistory(user.uid)
      .then((msgs) => {
        if (!controller.signal.aborted) setMessages(msgs);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          logger.error("Failed to load chat history", { error: err instanceof Error ? err.message : String(err) });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => { controller.abort(); };
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const msgs = await getChatHistory(user.uid);
      setMessages(msgs);
    } catch (err) {
      logger.error("Failed to refresh chat history", { error: err instanceof Error ? err.message : String(err) });
    }
  }, [user]);

  const save = useCallback(async (msg: Omit<ChatMessage, "id" | "timestamp">) => {
    if (!user) return;
    try {
      await saveChatMessage(user.uid, msg);
    } catch (err) {
      logger.error("Failed to save chat message", { error: err instanceof Error ? err.message : String(err) });
    }
  }, [user]);

  return { messages, loading, save, refresh };
}
