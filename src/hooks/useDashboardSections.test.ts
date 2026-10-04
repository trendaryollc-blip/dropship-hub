import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDashboardSections } from "./useDashboardSections";

describe("useDashboardSections", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows all sections by default", () => {
    const { result } = renderHook(() => useDashboardSections());
    expect(result.current.hidden).toEqual([]);
    expect(result.current.isVisible("revenue")).toBe(true);
  });

  it("toggles a section hidden and back", () => {
    const { result } = renderHook(() => useDashboardSections());
    act(() => {
      result.current.toggle("revenue");
    });
    expect(result.current.hidden).toContain("revenue");
    expect(result.current.isVisible("revenue")).toBe(false);

    act(() => {
      result.current.toggle("revenue");
    });
    expect(result.current.isVisible("revenue")).toBe(true);
  });

  it("persists hidden sections to localStorage", () => {
    const { result } = renderHook(() => useDashboardSections());
    act(() => {
      result.current.toggle("orders");
    });
    const raw = window.localStorage.getItem("dashboard:hidden-sections");
    expect(raw).toContain("orders");
  });

  it("hydrates hidden sections from localStorage", () => {
    window.localStorage.setItem("dashboard:hidden-sections", JSON.stringify(["market"]));
    const { result } = renderHook(() => useDashboardSections());
    expect(result.current.isVisible("market")).toBe(false);
    expect(result.current.isVisible("revenue")).toBe(true);
  });

  it("reset shows all sections again", () => {
    const { result } = renderHook(() => useDashboardSections());
    act(() => {
      result.current.toggle("growth");
    });
    expect(result.current.isVisible("growth")).toBe(false);
    act(() => {
      result.current.reset();
    });
    expect(result.current.hidden).toEqual([]);
    expect(result.current.isVisible("growth")).toBe(true);
  });

  it("ignores invalid stored values", () => {
    window.localStorage.setItem(
      "dashboard:hidden-sections",
      JSON.stringify(["revenue", "not-a-section", 42])
    );
    const { result } = renderHook(() => useDashboardSections());
    expect(result.current.hidden).toEqual(["revenue"]);
  });
});
