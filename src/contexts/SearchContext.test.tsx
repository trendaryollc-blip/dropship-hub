import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { SearchProvider, useSearch } from "./SearchContext";

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <SearchProvider>{children}</SearchProvider>;
  };
}

describe("SearchContext", () => {
  it("throws when useSearch is used outside provider", () => {
    expect(() => {
      renderHook(() => useSearch());
    }).toThrow("useSearch must be used within SearchProvider");
  });

  it("provides default empty state", () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    expect(result.current.lastQuery).toBe("");
    expect(result.current.lastResults).toEqual([]);
    expect(result.current.selectedProduct).toBeNull();
  });

  it("updates lastQuery", () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    act(() => {
      result.current.setLastQuery("wireless headphones");
    });
    expect(result.current.lastQuery).toBe("wireless headphones");
  });

  it("updates lastResults", () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    const results = [
      { id: "1", title: "Product A", price: 10, image: null, link: "http://test.com", source: "amazon" },
    ];
    act(() => {
      result.current.setLastResults(results);
    });
    expect(result.current.lastResults).toEqual(results);
  });

  it("updates selectedProduct", () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    const product = { id: "p1", title: "Widget", price: 25, image: "img.jpg", link: "http://test.com", source: "amazon" };
    act(() => {
      result.current.setSelectedProduct(product);
    });
    expect(result.current.selectedProduct).toEqual(product);
  });

  it("clears selectedProduct with null", () => {
    const { result } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    act(() => {
      result.current.setSelectedProduct({ id: "p1", title: "X", price: 5, image: null, link: "", source: "test" });
    });
    expect(result.current.selectedProduct).not.toBeNull();
    act(() => {
      result.current.setSelectedProduct(null);
    });
    expect(result.current.selectedProduct).toBeNull();
  });

  it("provides stable function references across rerenders", () => {
    const { result, rerender } = renderHook(() => useSearch(), { wrapper: createWrapper() });
    const fns = {
      setLastQuery: result.current.setLastQuery,
      setLastResults: result.current.setLastResults,
      setSelectedProduct: result.current.setSelectedProduct,
    };
    rerender();
    expect(result.current.setLastQuery).toBe(fns.setLastQuery);
    expect(result.current.setLastResults).toBe(fns.setLastResults);
    expect(result.current.setSelectedProduct).toBe(fns.setSelectedProduct);
  });
});
