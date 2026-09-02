import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInView } from "./useInView";

describe("useInView", () => {
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDisconnect = vi.fn();

    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(() => ({
        observe: vi.fn(),
        disconnect: mockDisconnect,
        unobserve: vi.fn(),
        root: null,
        rootMargin: "",
        thresholds: [],
        takeRecords: vi.fn(() => []),
      }))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a ref and isInView=false initially", () => {
    const { result } = renderHook(() => useInView());
    expect(result.current.ref).toBeDefined();
    expect(result.current.isInView).toBe(false);
  });

  it("ref is null when not attached to DOM", () => {
    const { result } = renderHook(() => useInView());
    expect(result.current.ref.current).toBeNull();
  });

  it("uses default options", () => {
    const { result } = renderHook(() => useInView());
    expect(result.current.ref).toBeDefined();
    expect(result.current.isInView).toBe(false);
  });

  it("accepts custom threshold and rootMargin", () => {
    const { result } = renderHook(() =>
      useInView({ threshold: 0.5, rootMargin: "10px", triggerOnce: false })
    );
    expect(result.current.ref).toBeDefined();
    expect(result.current.isInView).toBe(false);
  });

  it("accepts triggerOnce option", () => {
    const { result } = renderHook(() => useInView({ triggerOnce: true }));
    expect(result.current.ref).toBeDefined();
    expect(result.current.isInView).toBe(false);
  });

  it("returns stable ref between renders", () => {
    const { result, rerender } = renderHook(() => useInView());
    const ref1 = result.current.ref;
    rerender();
    expect(result.current.ref).toBe(ref1);
  });

  it("returns stable isInView across rerenders when not intersecting", () => {
    const { result, rerender } = renderHook(() => useInView());
    expect(result.current.isInView).toBe(false);
    rerender();
    expect(result.current.isInView).toBe(false);
  });

  it("isInView stays false for triggerOnce=false", () => {
    const { result } = renderHook(() => useInView({ triggerOnce: false }));
    expect(result.current.isInView).toBe(false);
  });

  it("isInView stays false with custom threshold", () => {
    const { result } = renderHook(() => useInView({ threshold: 0.8 }));
    expect(result.current.isInView).toBe(false);
  });

  it("isInView stays false with custom rootMargin", () => {
    const { result } = renderHook(() => useInView({ rootMargin: "100px" }));
    expect(result.current.isInView).toBe(false);
  });

  it("does not throw on unmount when ref is null", () => {
    const { unmount } = renderHook(() => useInView());
    expect(() => unmount()).not.toThrow();
  });

  it("accepts empty options object", () => {
    const { result } = renderHook(() => useInView({}));
    expect(result.current.ref).toBeDefined();
    expect(result.current.isInView).toBe(false);
  });
});
