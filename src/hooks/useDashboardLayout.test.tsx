import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

const mockUser = { email: "test@example.com", uid: "123" };

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: vi.fn(() => ({ user: mockUser })),
}));

const mockMutate = vi.fn();
const mockUseAPI = vi.fn();

vi.mock("@/hooks/useAPI", () => ({
  useAPI: (...args: unknown[]) => mockUseAPI(...args),
}));

vi.mock("@/components/dashboard/BentoLayoutPresets", () => ({
  defaultLayout: { columns: 4, gap: 16, cards: [] },
  default: { columns: 4, gap: 16, cards: [] },
}));

import { useDashboardLayout } from "./useDashboardLayout";
import { useAuth } from "@/components/auth/AuthProvider";

function wrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

describe("useDashboardLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it("returns default layout initially", () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useDashboardLayout(), { wrapper });
    expect(result.current.layout).toEqual({ columns: 4, gap: 16, cards: [] });
  });

  it("returns loading true initially", () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useDashboardLayout(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("sets loading to false when SWR finishes", async () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    expect(result!.current.isLoading).toBe(false);
  });

  it("uses layout from API data when available", async () => {
    const customLayout = { columns: 3, gap: 20, cards: [{ id: "1" }] };
    mockUseAPI.mockReturnValue({ data: { layout: customLayout }, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    expect(result!.current.layout).toEqual(customLayout);
  });

  it("fetches from correct API endpoint", async () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    await act(async () => {
      renderHook(() => useDashboardLayout(), { wrapper });
    });
    expect(mockUseAPI).toHaveBeenCalledWith("/api/settings/dashboard-layout");
  });

  it("does not fetch when user is null", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    await act(async () => {
      renderHook(() => useDashboardLayout(), { wrapper });
    });
    expect(mockUseAPI).toHaveBeenCalledWith(null);
  });

  it("setLayout updates local state", async () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    const newLayout = { columns: 2, gap: 10, cards: [] };
    await act(async () => {
      result!.current.setLayout(newLayout);
    });
    expect(result!.current.layout).toEqual(newLayout);
  });

  it("setLayout sends PUT request when user exists", async () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    const newLayout = { columns: 2, gap: 10, cards: [] };
    await act(async () => {
      await result!.current.setLayout(newLayout);
    });
    expect(global.fetch).toHaveBeenCalledWith("/api/settings/dashboard-layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: newLayout }),
    });
  });

  it("setLayout does not send request when user is null", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    const newLayout = { columns: 2, gap: 10, cards: [] };
    await act(async () => {
      await result!.current.setLayout(newLayout);
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("resetToDefault resets to default layout", async () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    await act(async () => {
      result!.current.setLayout({ columns: 2, gap: 10, cards: [] });
    });
    await act(async () => {
      result!.current.resetToDefault();
    });
    expect(result!.current.layout).toEqual({ columns: 4, gap: 16, cards: [] });
  });

  it("resetToDefault sends PUT request when user exists", async () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    await act(async () => {
      result!.current.setLayout({ columns: 2, gap: 10, cards: [] });
    });
    vi.mocked(global.fetch).mockClear();
    await act(async () => {
      await result!.current.resetToDefault();
    });
    expect(global.fetch).toHaveBeenCalledWith("/api/settings/dashboard-layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: { columns: 4, gap: 16, cards: [] } }),
    });
  });

  it("resetToDefault does not send request when user is null", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    await act(async () => {
      await result!.current.resetToDefault();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("handles setLayout fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (global.fetch as any).mockRejectedValue(new Error("Network error"));
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    const newLayout = { columns: 2, gap: 10, cards: [] };
    await act(async () => {
      await result!.current.setLayout(newLayout);
    });
    expect(result!.current.layout).toEqual(newLayout);
    consoleSpy.mockRestore();
  });

  it("handles resetToDefault fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (global.fetch as any).mockRejectedValue(new Error("Network error"));
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    await act(async () => {
      await result!.current.resetToDefault();
    });
    expect(result!.current.layout).toEqual({ columns: 4, gap: 16, cards: [] });
    consoleSpy.mockRestore();
  });

  it("returns isLoading false when SWR returns data", async () => {
    const customLayout = { columns: 3, gap: 20, cards: [] };
    mockUseAPI.mockReturnValue({ data: { layout: customLayout }, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    expect(result!.current.isLoading).toBe(false);
    expect(result!.current.layout).toEqual(customLayout);
  });

  it("provides setLayout function", async () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    expect(typeof result!.current.setLayout).toBe("function");
  });

  it("provides resetToDefault function", async () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false });
    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useDashboardLayout(), { wrapper }));
    });
    expect(typeof result!.current.resetToDefault).toBe("function");
  });
});
