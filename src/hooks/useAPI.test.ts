import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAPI, useMutation, revalidate } from "./useAPI";
import React from "react";

vi.mock("swr", () => ({
  default: vi.fn((url: string, fetcher: any, opts: any) => {
    return {
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: vi.fn(),
      ...opts,
    };
  }),
  mutate: vi.fn(),
}));

vi.mock("swr/mutation", () => ({
  default: vi.fn((_url: string, fetcher: any, opts: any) => ({
    trigger: vi.fn(async (args?: any) => {
      if (fetcher) await fetcher(_url, { arg: args || {} });
      return {} as any;
    }),
    data: undefined,
    error: undefined,
    isMutating: false,
    ...opts,
  })),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({ data: "ok" }),
}));

vi.mock("@/lib/firebase", () => ({
  auth: {
    currentUser: null,
    getIdToken: vi.fn(),
  },
}));

describe("useAPI", () => {
  it("returns loading state initially", () => {
    const { result } = renderHook(() => useAPI("/api/test"));
    expect(result.current.isLoading).toBe(true);
  });

  it("accepts null URL", () => {
    const { result } = renderHook(() => useAPI(null));
    expect(result.current.isLoading).toBe(true);
  });

  it("passes options to SWR", () => {
    const { result } = renderHook(() =>
      useAPI("/api/test", { refreshInterval: 30000 })
    );
    expect(result.current.isLoading).toBe(true);
  });
});

describe("useMutation", () => {
  it("returns trigger function", () => {
    const { result } = renderHook(() => useMutation("/api/test"));
    expect(typeof result.current.trigger).toBe("function");
    expect(result.current.isMutating).toBe(false);
  });

  it("returns undefined data initially", () => {
    const { result } = renderHook(() => useMutation("/api/test"));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it("accepts onSuccess option", () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useMutation("/api/test", { onSuccess }));
    expect(typeof result.current.trigger).toBe("function");
  });
});

describe("revalidate", () => {
  it("is a function", () => {
    expect(typeof revalidate).toBe("function");
  });

  it("calls swr mutate", async () => {
    const swr = await import("swr");
    await revalidate("/api/test");
    expect(swr.mutate).toHaveBeenCalledWith("/api/test");
  });
});
