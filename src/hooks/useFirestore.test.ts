import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";

const mockUser = { uid: "user-123" };

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}));

vi.mock("@/lib/data", () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  getFavorites: vi.fn(),
  isFavorited: vi.fn(),
  saveCalcHistory: vi.fn(),
  getCalcHistory: vi.fn(),
  saveChatMessage: vi.fn(),
  getChatHistory: vi.fn(),
}));

import { useFavorites, useCalcHistory, useChatHistory } from "./useFirestore";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorited,
  getCalcHistory,
  saveCalcHistory,
  getChatHistory,
  saveChatMessage,
} from "@/lib/data";

describe("useFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFavorites).mockResolvedValue([]);
  });

  it("loads favorites on mount", async () => {
    const favs = [{ id: "product_1", type: "product", itemId: "1", title: "Widget" }];
    vi.mocked(getFavorites).mockResolvedValue(favs as never);

    const { result } = renderHook(() => useFavorites("product"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.favorites).toEqual(favs);
  });

  it("returns empty array when no user", async () => {
    const { useAuth } = await import("@/components/auth/AuthProvider");
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);

    const { result } = renderHook(() => useFavorites("product"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.favorites).toEqual([]);

    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as never);
  });

  it("toggle adds a favorite when not already favorited", async () => {
    vi.mocked(getFavorites).mockResolvedValue([]);
    vi.mocked(addFavorite).mockResolvedValue(undefined);
    vi.mocked(removeFavorite).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFavorites("product"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggle("item-1", "Test Product");
    });

    expect(addFavorite).toHaveBeenCalledWith("user-123", "product", "item-1", "Test Product");
  });

  it("toggle removes a favorite when already favorited", async () => {
    const favs = [{ id: "product_item-1", type: "product", itemId: "item-1", title: "Test" }];
    vi.mocked(getFavorites).mockResolvedValue(favs as never);
    vi.mocked(removeFavorite).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFavorites("product"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggle("item-1", "Test Product");
    });

    expect(removeFavorite).toHaveBeenCalledWith("user-123", "product", "item-1");
  });

  it("check returns true when favorited", async () => {
    vi.mocked(isFavorited).mockResolvedValue(true);

    const { result } = renderHook(() => useFavorites("product"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const checked = await result.current.check("item-1");
    expect(checked).toBe(true);
  });

  it("check returns false when not favorited", async () => {
    vi.mocked(isFavorited).mockResolvedValue(false);

    const { result } = renderHook(() => useFavorites("product"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const checked = await result.current.check("item-1");
    expect(checked).toBe(false);
  });

  it("check returns false when no user", async () => {
    const { useAuth } = await import("@/components/auth/AuthProvider");
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);

    const { result } = renderHook(() => useFavorites("product"));
    const checked = await result.current.check("item-1");
    expect(checked).toBe(false);

    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as never);
  });
});

describe("useCalcHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCalcHistory).mockResolvedValue([]);
  });

  it("loads calc history on mount", async () => {
    const history = [{ id: "1", type: "standard", inputs: {}, result: {}, savedAt: new Date() }];
    vi.mocked(getCalcHistory).mockResolvedValue(history as never);

    const { result } = renderHook(() => useCalcHistory("standard"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.history).toEqual(history);
  });

  it("save calls saveCalcHistory and refreshes", async () => {
    vi.mocked(saveCalcHistory).mockResolvedValue(undefined);
    vi.mocked(getCalcHistory).mockResolvedValue([]);

    const { result } = renderHook(() => useCalcHistory("standard"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save({ type: "standard", inputs: {}, result: {} });
    });

    expect(saveCalcHistory).toHaveBeenCalled();
  });

  it("returns empty when no user", async () => {
    const { useAuth } = await import("@/components/auth/AuthProvider");
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);

    const { result } = renderHook(() => useCalcHistory("standard"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.history).toEqual([]);

    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as never);
  });
});

describe("useChatHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getChatHistory).mockResolvedValue([]);
  });

  it("loads chat history on mount", async () => {
    const msgs = [{ id: "1", role: "user", content: "hi", timestamp: new Date() }];
    vi.mocked(getChatHistory).mockResolvedValue(msgs as never);

    const { result } = renderHook(() => useChatHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual(msgs);
  });

  it("save calls saveChatMessage", async () => {
    vi.mocked(saveChatMessage).mockResolvedValue(undefined);

    const { result } = renderHook(() => useChatHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save({ role: "user", content: "hello" });
    });

    expect(saveChatMessage).toHaveBeenCalled();
  });

  it("returns empty when no user", async () => {
    const { useAuth } = await import("@/components/auth/AuthProvider");
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);

    const { result } = renderHook(() => useChatHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([]);

    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as never);
  });
});
