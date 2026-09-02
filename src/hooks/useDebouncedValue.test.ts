import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("debounces value changes", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: "hello", delay: 500 } }
    );
    
    rerender({ value: "world", delay: 500 });
    expect(result.current).toBe("hello");

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
    });
    expect(result.current).toBe("world");
  });
});
