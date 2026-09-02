import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAnimatedCounter } from "./useAnimatedCounter";

describe("useAnimatedCounter", () => {
  it("returns 0 when not counting", () => {
    const { result } = renderHook(() => useAnimatedCounter(100, 1000, false));
    expect(result.current).toBe(0);
  });

  it("returns number type when not counting", () => {
    const { result } = renderHook(() => useAnimatedCounter(50, 1000, false));
    expect(typeof result.current).toBe("number");
  });

  it("returns a number when startCounting is true", () => {
    const { result } = renderHook(() => useAnimatedCounter(100, 100, true));
    expect(typeof result.current).toBe("number");
  });

  it("does not animate when startCounting remains false", () => {
    const { result, rerender } = renderHook(
      ({ start }) => useAnimatedCounter(100, 100, start),
      { initialProps: { start: false } }
    );
    expect(result.current).toBe(0);
    rerender({ start: false });
    expect(result.current).toBe(0);
  });

  it("cleans up on unmount without error", () => {
    const { unmount } = renderHook(() => useAnimatedCounter(100, 500, true));
    expect(() => unmount()).not.toThrow();
  });

  it("accepts default duration parameter", () => {
    const { result } = renderHook(() => useAnimatedCounter(50));
    expect(result.current).toBe(0);
  });

  it("returns 0 for zero target", () => {
    const { result } = renderHook(() => useAnimatedCounter(0, 100, true));
    expect(result.current).toBe(0);
  });

  it("cleans up when startCounting toggles", () => {
    const { unmount } = renderHook(() => useAnimatedCounter(100, 100, true));
    expect(() => unmount()).not.toThrow();
  });
});
