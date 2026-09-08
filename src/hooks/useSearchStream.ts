"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface SearchResult {
  title: string;
  price: number | null;
  image: string | null;
  images?: string[];
  link: string;
  source: string;
  brand?: string;
  rating?: number;
  reviews?: number;
  [key: string]: unknown;
}

export interface PlatformError {
  platform: string;
  error: string;
}

export interface UseSearchStreamReturn {
  results: SearchResult[];
  completedPlatforms: string[];
  loadingPlatforms: string[];
  errorPlatforms: PlatformError[];
  isStreaming: boolean;
  totalExpected: number;
  totalResults: number;
  startStream: (query: string, platforms?: string[]) => void;
  abort: () => void;
  reset: () => void;
}

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  amazon: "Amazon",
  ebay: "eBay",
  aliexpress: "AliExpress",
  cj: "CJ Dropshipping",
  google_shopping: "Google Shopping",
  walmart: "Walmart",
  etsy: "Etsy",
  temu: "Temu",
  shein: "Shein",
  banggood: "Banggood",
  dhgate: "DHgate",
  alibaba: "Alibaba",
  "1688": "1688",
};

export { PLATFORM_DISPLAY_NAMES };

export function useSearchStream(): UseSearchStreamReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [completedPlatforms, setCompletedPlatforms] = useState<string[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState<string[]>([]);
  const [errorPlatforms, setErrorPlatforms] = useState<PlatformError[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [totalExpected, setTotalExpected] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const reset = useCallback(() => {
    setResults([]);
    setCompletedPlatforms([]);
    setLoadingPlatforms([]);
    setErrorPlatforms([]);
    setIsStreaming(false);
    setTotalExpected(0);
    seenIdsRef.current.clear();
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startStream = useCallback(
    (query: string, platforms?: string[]) => {
      abort();
      reset();

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);

      const defaultPlatforms = [
        "amazon", "ebay", "aliexpress", "cj", "google_shopping",
        "walmart", "etsy", "temu", "shein", "banggood", "dhgate", "alibaba",
      ];
      const targetPlatforms = platforms && platforms.length > 0 ? platforms : defaultPlatforms;
      setTotalExpected(targetPlatforms.length);
      setLoadingPlatforms([...targetPlatforms]);

      const fetchStream = async () => {
        try {
          const response = await fetch("/api/platforms/search-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, platforms: targetPlatforms, stream: true }),
            signal: controller.signal,
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("text/event-stream")) {
            const reader = response.body?.getReader();
            if (!reader) throw new Error("No readable stream");

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const event = JSON.parse(line.slice(6));
                    handleStreamEvent(event);
                  } catch { /* skip malformed */ }
                }
              }
            }
          } else {
            const data = await response.json();
            if (data.results && Array.isArray(data.results)) {
              const deduped = data.results.filter((r: SearchResult) => {
                const key = `${r.source}:${r.title}:${r.price}`;
                if (seenIdsRef.current.has(key)) return false;
                seenIdsRef.current.add(key);
                return true;
              });
              setResults(deduped);
            }
            if (data.platforms) {
              const names = Object.keys(data.platforms);
              setCompletedPlatforms(names);
              setLoadingPlatforms([]);
            }
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") return;
          // Fallback: non-streaming fetch
          try {
            const fallbackResponse = await fetch("/api/platforms/search-all", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query, platforms: targetPlatforms }),
              signal: controller.signal,
            });
            if (fallbackResponse.ok) {
              const data = await fallbackResponse.json();
              if (data.results && Array.isArray(data.results)) {
                const deduped = data.results.filter((r: SearchResult) => {
                  const key = `${r.source}:${r.title}:${r.price}`;
                  if (seenIdsRef.current.has(key)) return false;
                  seenIdsRef.current.add(key);
                  return true;
                });
                setResults(deduped);
              }
              setCompletedPlatforms(targetPlatforms);
              setLoadingPlatforms([]);
            }
          } catch { /* final failure */ }
        } finally {
          setIsStreaming(false);
        }
      };

      const handleStreamEvent = (event: { type: string; platform?: string; results?: SearchResult[]; error?: string }) => {
        switch (event.type) {
          case "platform:start":
            if (event.platform) {
              setLoadingPlatforms((prev) =>
                prev.includes(event.platform!) ? prev : [...prev, event.platform!]
              );
            }
            break;
          case "platform:result":
            if (event.platform && event.results) {
              const newResults = event.results.filter((r) => {
                const key = `${r.source}:${r.title}:${r.price}`;
                if (seenIdsRef.current.has(key)) return false;
                seenIdsRef.current.add(key);
                return true;
              });
              setResults((prev) => [...prev, ...newResults]);
              setCompletedPlatforms((prev) =>
                prev.includes(event.platform!) ? prev : [...prev, event.platform!]
              );
              setLoadingPlatforms((prev) => prev.filter((p) => p !== event.platform));
            }
            break;
          case "platform:error":
            if (event.platform) {
              setErrorPlatforms((prev) => [
                ...prev,
                { platform: event.platform!, error: event.error || "Unknown error" },
              ]);
              setCompletedPlatforms((prev) =>
                prev.includes(event.platform!) ? prev : [...prev, event.platform!]
              );
              setLoadingPlatforms((prev) => prev.filter((p) => p !== event.platform));
            }
            break;
          case "done":
            setIsStreaming(false);
            break;
        }
      };

      fetchStream();
    },
    [abort, reset]
  );

  return {
    results,
    completedPlatforms,
    loadingPlatforms,
    errorPlatforms,
    isStreaming,
    totalExpected,
    totalResults: results.length,
    startStream,
    abort,
    reset,
  };
}
