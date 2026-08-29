"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ProductData {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  images?: string[];
  link: string;
  source: string;
  rating?: number;
  reviews?: number;
  category?: string;
  tags?: string[];
  productId?: string;
  asin?: string;
}

interface SearchResult {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  images?: string[];
  link: string;
  source: string;
  rating?: number;
  reviews?: number;
}

interface SearchContextType {
  lastQuery: string;
  lastResults: SearchResult[];
  selectedProduct: ProductData | null;
  setLastQuery: (query: string) => void;
  setLastResults: (results: SearchResult[]) => void;
  setSelectedProduct: (product: ProductData | null) => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useSearch must be used within SearchProvider");
  return context;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [lastQuery, setLastQuery] = useState("");
  const [lastResults, setLastResults] = useState<SearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);

  return (
    <SearchContext.Provider
      value={{
        lastQuery,
        lastResults,
        selectedProduct,
        setLastQuery,
        setLastResults,
        setSelectedProduct,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}
