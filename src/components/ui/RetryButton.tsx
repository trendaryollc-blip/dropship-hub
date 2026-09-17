"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";

interface RetryButtonProps {
  onRetry: () => Promise<void>;
  maxRetries?: number;
  label?: string;
  className?: string;
}

export default function RetryButton({ onRetry, maxRetries = 3, label = "Retry", className = "" }: RetryButtonProps) {
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = async () => {
    if (retryCount >= maxRetries) return;
    setRetrying(true);
    try {
      await onRetry();
      setRetryCount(0);
    } catch {
      setRetryCount((c) => c + 1);
    }
    setRetrying(false);
  };

  const exhausted = retryCount >= maxRetries;

  return (
    <button
      onClick={handleRetry}
      disabled={retrying || exhausted}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/20 transition-all disabled:opacity-50 ${className}`}
    >
      {retrying ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="h-3 w-3" />
      )}
      {exhausted ? "Max retries reached" : retrying ? "Retrying..." : label}
    </button>
  );
}
