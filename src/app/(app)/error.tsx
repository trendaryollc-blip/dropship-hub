"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10 border border-red-400/20 mb-5">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h2 className="font-display text-xl font-bold text-foreground mb-2">Page Error</h2>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-1">
        Something went wrong on this page.
      </p>
      {error.digest && (
        <p className="text-[11px] text-muted-foreground/60 font-mono mb-4">Error ID: {error.digest}</p>
      )}
      <p className="text-xs text-muted-foreground/60 text-center max-w-md mb-6">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-semibold hover:bg-accent/20 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
        <a
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </a>
      </div>
    </div>
  );
}
