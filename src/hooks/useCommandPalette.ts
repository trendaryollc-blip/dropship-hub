"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { searchCommands, type Command } from "@/lib/command-registry";

interface UseCommandPaletteResult {
  isOpen: boolean;
  query: string;
  results: Command[];
  selectedIndex: number;
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  selectNext: () => void;
  selectPrev: () => void;
  executeSelected: () => void;
}

export function useCommandPalette(): UseCommandPaletteResult {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = searchCommands(query);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
  }, [results.length]);

  const selectPrev = useCallback(() => {
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const executeSelected = useCallback(() => {
    const selected = results[selectedIndex];
    if (selected?.href) {
      window.location.href = selected.href;
      close();
    }
  }, [results, selectedIndex, close]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, open, close]);

  return {
    isOpen,
    query,
    results,
    selectedIndex,
    open,
    close,
    setQuery,
    setSelectedIndex,
    selectNext,
    selectPrev,
    executeSelected,
  };
}
