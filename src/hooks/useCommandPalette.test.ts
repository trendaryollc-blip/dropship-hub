import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommandPalette } from "./useCommandPalette";

describe("useCommandPalette", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts closed", () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
  });

  it("opens on open()", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  it("closes on close()", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => result.current.open());
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it("toggles with Cmd+K", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true })
      );
    });
    expect(result.current.isOpen).toBe(true);
  });

  it("closes with Escape", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => result.current.open());
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape" })
      );
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("setQuery updates query and results", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => result.current.open());
    act(() => result.current.setQuery("dashboard"));
    expect(result.current.query).toBe("dashboard");
    expect(result.current.results.some((c) => c.id === "dashboard")).toBe(true);
  });

  it("selectNext increments selectedIndex", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => result.current.open());
    const initial = result.current.selectedIndex;
    act(() => result.current.selectNext());
    expect(result.current.selectedIndex).toBe(initial + 1);
  });

  it("selectPrev decrements selectedIndex", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => result.current.open());
    act(() => result.current.selectNext());
    act(() => result.current.selectPrev());
    expect(result.current.selectedIndex).toBe(0);
  });
});
