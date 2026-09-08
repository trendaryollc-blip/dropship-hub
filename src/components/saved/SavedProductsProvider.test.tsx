import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { SavedProductsProvider, useSavedProducts } from "./SavedProductsProvider";

vi.mock("@/lib/firebase", () => ({ db: {} }));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  collection: vi.fn(),
}));

describe("SavedProductsProvider", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
      get length() { return Object.keys(store).length; },
      key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SavedProductsProvider>{children}</SavedProductsProvider>
  );

  it("provides context with initial empty state", () => {
    const { result } = renderHook(() => useSavedProducts(), { wrapper });
    expect(result.current.savedProducts).toEqual([]);
    expect(result.current.isSelectMode).toBe(false);
  });

  it("toggleSave adds product to list", () => {
    const { result } = renderHook(() => useSavedProducts(), { wrapper });
    const product = {
      id: "p1",
      title: "Test",
      price: 10,
      image: null,
      link: "",
      source: "amazon",
      savedAt: Date.now(),
    };
    act(() => {
      result.current.toggleSave(product);
    });
    expect(result.current.savedProducts).toHaveLength(1);
    expect(result.current.savedProducts[0].id).toBe("p1");
  });

  it("toggleSave removes product if already saved", () => {
    const { result } = renderHook(() => useSavedProducts(), { wrapper });
    const product = {
      id: "p1",
      title: "Test",
      price: 10,
      image: null,
      link: "",
      source: "amazon",
      savedAt: Date.now(),
    };
    act(() => {
      result.current.toggleSave(product);
    });
    act(() => {
      result.current.toggleSave(product);
    });
    expect(result.current.savedProducts).toHaveLength(0);
  });

  it("clearSaved empties the list", () => {
    const { result } = renderHook(() => useSavedProducts(), { wrapper });
    const product = {
      id: "p1",
      title: "Test",
      price: 10,
      image: null,
      link: "",
      source: "amazon",
      savedAt: Date.now(),
    };
    act(() => {
      result.current.toggleSave(product);
    });
    act(() => {
      result.current.clearSaved();
    });
    expect(result.current.savedProducts).toHaveLength(0);
  });
});
